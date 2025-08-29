from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.db.models import Q
import markdown
import bleach
import logging
from .models import Note, Rating, Review, Diagram, NoteDiagram
from .serializers import (
    NoteSerializer, NoteCreateSerializer, NoteUpdateSerializer, RatingSerializer,
    ReviewSerializer, ReviewCreateSerializer, DiagramSerializer, DiagramCreateSerializer,
    DiagramUpdateSerializer, NoteDiagramSerializer, NoteDiagramCreateSerializer
)
from libraries.models import LibraryBook
from search.services import semantic_search_service

logger = logging.getLogger(__name__)


class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['library_book', 'ai_generated', 'ref_book', 'ref_chapter', 'ref_section', 'ref_subsection']
    # search_fields = ['title', 'content_markdown']  # Commented out to avoid conflict with custom search action
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Note.objects.all()
        library_book_id = self.request.query_params.get('library_book_id')
        if library_book_id:
            queryset = queryset.filter(library_book_id=library_book_id)
        return queryset

    def get_serializer_class(self):
        if self.action in ['create']:
            return NoteCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return NoteUpdateSerializer
        return NoteSerializer
    
    def perform_create(self, serializer):
        """Create note with HTML conversion."""
        note = serializer.save()
        self._convert_markdown_to_html(note)
        return note
    
    def perform_update(self, serializer):
        """Update note with HTML conversion."""
        note = serializer.save()
        self._convert_markdown_to_html(note)
        return note
    
    def _convert_markdown_to_html(self, note):
        """Convert markdown content to HTML."""
        if note.content_markdown:
            # Convert markdown to HTML
            html = markdown.markdown(note.content_markdown, extensions=['fenced_code', 'tables'])
            # Clean HTML to prevent XSS
            clean_html = bleach.clean(html, tags=set(bleach.ALLOWED_TAGS) | {'pre', 'code'})
            note.content_html = clean_html
            note.save(update_fields=['content_html'])

    @action(detail=True, methods=['post'])
    def ai_assist(self, request, pk=None):
        """AI-assisted note enhancement."""
        note = self.get_object()
        prompt = request.data.get('prompt')
        context_scope = request.data.get('context_scope', 'book')
        
        if not prompt:
            return Response({'error': 'Prompt is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get context based on scope
            context = self._get_context_for_ai(note, context_scope)
            
            # Call AI service
            enhanced_content = semantic_search_service.enhance_note(
                note.content_markdown, prompt, context
            )
            
            # Create new note with AI content
            new_note = Note.objects.create(
                library_book=note.library_book,
                title=f"AI Enhanced: {note.title}",
                content_markdown=enhanced_content,
                ai_generated=True,
                ref_book=note.ref_book,
                ref_chapter=note.ref_chapter,
                ref_section=note.ref_section,
                ref_subsection=note.ref_subsection
            )
            
            # Convert to HTML
            self._convert_markdown_to_html(new_note)
            
            serializer = self.get_serializer(new_note)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"AI assist failed: {e}")
            return Response({'error': 'AI enhancement failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_context_for_ai(self, note, scope):
        """Get context for AI enhancement."""
        context = []
        
        if scope == 'book' and note.library_book.book.description:
            context.append(f"Book description: {note.library_book.book.description}")
        
        if scope == 'notes':
            # Get other notes for the same book
            other_notes = Note.objects.filter(
                library_book=note.library_book
            ).exclude(id=note.id)[:5]
            for other_note in other_notes:
                context.append(f"Note: {other_note.content_markdown[:200]}...")
        
        return "\n".join(context)

    @action(detail=True, methods=['get'])
    def references(self, request, pk=None):
        """Get notes that reference this note's book/chapter/section."""
        note = self.get_object()
        
        # Find notes that reference the same book hierarchy
        referenced_notes = Note.objects.none()
        
        if note.ref_book:
            referenced_notes = Note.objects.filter(ref_book=note.ref_book).exclude(id=note.id)
        elif note.ref_chapter:
            referenced_notes = Note.objects.filter(ref_chapter=note.ref_chapter).exclude(id=note.id)
        elif note.ref_section:
            referenced_notes = Note.objects.filter(ref_section=note.ref_section).exclude(id=note.id)
        elif note.ref_subsection:
            referenced_notes = Note.objects.filter(ref_subsection=note.ref_subsection).exclude(id=note.id)
        
        serializer = self.get_serializer(referenced_notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search notes with exact, fuzzy, and semantic search."""
        query = request.query_params.get('q', '').strip()
        search_type = request.query_params.get('type', 'exact')  # exact, fuzzy, semantic
        library_book_id = request.query_params.get('library_book_id')
        library_id = request.query_params.get('library_id')
        limit = min(int(request.query_params.get('limit', 20)), 100)  # Max 100 results
        
        if not query:
            return Response({'results': [], 'total': 0})
        
        queryset = Note.objects.all()
        
        # Filter by library book if specified
        if library_book_id:
            queryset = queryset.filter(library_book_id=library_book_id)
        
        # Filter by library if specified
        if library_id:
            queryset = queryset.filter(library_book__library_id=library_id)
        
        results = []
        semantic_results = []  # Initialize for all code paths
        
        if search_type == 'exact':
            # Exact search - case-insensitive
            results = queryset.filter(
                Q(title__icontains=query) |
                Q(content_markdown__icontains=query) |
                Q(content_blocks_html__icontains=query)
            )[:limit]
            
        elif search_type == 'fuzzy':
            # Fuzzy search using Django's built-in search
            from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
            from django.db.models import F
            
            # Create search vector for title and content
            search_vector = SearchVector('title', weight='A') + SearchVector('content_markdown', weight='B')
            search_query = SearchQuery(query, config='english')
            
            results = queryset.annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query)
            ).filter(search=search_query).order_by('-rank')[:limit]
            
        elif search_type == 'semantic':
            # Semantic search using embeddings
            if semantic_search_service.is_enabled():
                # Get semantic search results
                semantic_results = semantic_search_service.search(query, library_id, limit)
                
                # Filter to only notes and get the actual note objects
                note_ids = [
                    int(result['id']) for result in semantic_results 
                    if result['type'] == 'note'
                ]
                
                if note_ids:
                    # Get notes in the order of semantic results
                    note_map = {note.id: note for note in queryset.filter(id__in=note_ids)}
                    results = [note_map[note_id] for note_id in note_ids if note_id in note_map]
                else:
                    results = []
            else:
                # Fallback to exact search if semantic search is not enabled
                results = queryset.filter(
                    Q(title__icontains=query) |
                    Q(content_markdown__icontains=query) |
                    Q(content_blocks_html__icontains=query)
                )[:limit]
        
        # Serialize results with search context
        serialized_results = []
        for note in results:
            note_data = self.get_serializer(note).data
            
            # Add search context (highlighted snippet)
            if search_type == 'exact':
                snippet = self._create_search_snippet(note, query)
                note_data['search_snippet'] = snippet
            elif search_type == 'fuzzy' and hasattr(note, 'rank'):
                snippet = self._create_search_snippet(note, query)
                note_data['search_snippet'] = snippet
                note_data['search_rank'] = float(note.rank)
            elif search_type == 'semantic':
                # Find the semantic result for this note
                semantic_result = next(
                    (r for r in semantic_results if r['type'] == 'note' and int(r['id']) == note.id),
                    None
                )
                if semantic_result:
                    note_data['search_snippet'] = semantic_result.get('snippet', '')
                    note_data['similarity_score'] = semantic_result.get('similarity_score', 0)
            
            serialized_results.append(note_data)
        
        return Response({
            'results': serialized_results,
            'total': len(serialized_results),
            'query': query,
            'search_type': search_type
        })

    def _create_search_snippet(self, note, query):
        """Create a search snippet highlighting the query."""
        content = note.content_markdown or note.content_blocks_html or ''
        if not content or not query:
            return content[:200] + '...' if len(content) > 200 else content
        
        # Find query in content (case insensitive)
        query_lower = query.lower()
        content_lower = content.lower()
        
        pos = content_lower.find(query_lower)
        if pos != -1:
            # Extract context around the query
            start = max(0, pos - 100)
            end = min(len(content), pos + len(query) + 100)
            
            snippet = content[start:end]
            
            # Add ellipsis if needed
            if start > 0:
                snippet = '...' + snippet
            if end < len(content):
                snippet = snippet + '...'
            
            return snippet
        
        # If query not found, return beginning of content
        return content[:200] + '...' if len(content) > 200 else content


class DiagramViewSet(viewsets.ModelViewSet):
    queryset = Diagram.objects.all()
    serializer_class = DiagramSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create']:
            return DiagramCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DiagramUpdateSerializer
        return DiagramSerializer

    @action(detail=True, methods=['post'])
    def update_preview(self, request, pk=None):
        """Update diagram preview (PNG/SVG)."""
        diagram = self.get_object()
        preview_svg = request.data.get('preview_svg')
        
        if preview_svg:
            diagram.preview_svg = preview_svg
            diagram.save(update_fields=['preview_svg'])
        
        serializer = self.get_serializer(diagram)
        return Response(serializer.data)


class NoteDiagramViewSet(viewsets.ModelViewSet):
    queryset = NoteDiagram.objects.all()
    serializer_class = NoteDiagramSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['note', 'diagram']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_serializer_class(self):
        if self.action in ['create']:
            return NoteDiagramCreateSerializer
        return NoteDiagramSerializer

    def get_queryset(self):
        queryset = NoteDiagram.objects.all()
        note_id = self.request.query_params.get('note_id')
        if note_id:
            queryset = queryset.filter(note_id=note_id)
        return queryset


class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['library_book', 'category']
    ordering_fields = ['rating', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Rating.objects.all()
        library_book_id = self.request.query_params.get('library_book_id')
        if library_book_id:
            queryset = queryset.filter(library_book_id=library_book_id)
        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get rating summary for a library book."""
        library_book_id = request.query_params.get('library_book_id')
        if not library_book_id:
            return Response({'error': 'library_book_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            ratings = Rating.objects.filter(library_book_id=library_book_id)
            
            if not ratings.exists():
                return Response({
                    'average_rating': 0,
                    'total_ratings': 0,
                    'rating_distribution': {},
                    'has_ratings': False
                })
            
            # Calculate average rating
            total_rating = sum(r.rating for r in ratings)
            average_rating = round(total_rating / ratings.count(), 1)
            
            # Calculate rating distribution
            rating_distribution = {}
            for i in range(1, 6):
                count = ratings.filter(rating=i).count()
                rating_distribution[i] = count
            
            return Response({
                'average_rating': average_rating,
                'total_ratings': ratings.count(),
                'rating_distribution': rating_distribution,
                'has_ratings': True
            })
            
        except Exception as e:
            logger.error(f"Error getting rating summary: {e}")
            return Response({'error': 'Failed to get rating summary'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['library_book']
    search_fields = ['title', 'body_markdown']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Review.objects.all()
        library_book_id = self.request.query_params.get('library_book_id')
        if library_book_id:
            queryset = queryset.filter(library_book_id=library_book_id)
        return queryset

    def get_serializer_class(self):
        if self.action in ['create']:
            return ReviewCreateSerializer
        return ReviewSerializer
    
    def perform_create(self, serializer):
        """Create review with HTML conversion."""
        review = serializer.save()
        self._convert_markdown_to_html(review)
        return review
    
    def perform_update(self, serializer):
        """Update review with HTML conversion."""
        review = serializer.save()
        self._convert_markdown_to_html(review)
        return review
    
    def _convert_markdown_to_html(self, review):
        """Convert markdown content to HTML."""
        if review.body_markdown:
            # Convert markdown to HTML
            html = markdown.markdown(review.body_markdown, extensions=['fenced_code', 'tables'])
            # Clean HTML to prevent XSS
            clean_html = bleach.clean(html, tags=bleach.ALLOWED_TAGS + ['pre', 'code'])
            review.body_html = clean_html
            review.save(update_fields=['body_html'])
