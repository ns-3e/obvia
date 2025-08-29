from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.db import transaction, models
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
    search_fields = ['title', 'content_markdown']
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
