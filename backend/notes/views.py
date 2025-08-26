from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.db import transaction
import markdown
import bleach
import logging
from .models import Note, Rating, Review
from .serializers import (
    NoteSerializer, NoteCreateSerializer, RatingSerializer,
    ReviewSerializer, ReviewCreateSerializer
)
from libraries.models import LibraryBook
from search.services import semantic_search_service

logger = logging.getLogger(__name__)


class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['library_book', 'ai_generated']
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
        if self.action in ['create', 'update', 'partial_update']:
            return NoteCreateSerializer
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
            html_content = markdown.markdown(
                note.content_markdown,
                extensions=['fenced_code', 'codehilite', 'tables', 'toc']
            )
            
            # Sanitize HTML
            allowed_tags = [
                'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table',
                'thead', 'tbody', 'tr', 'th', 'td'
            ]
            allowed_attrs = {
                'a': ['href', 'title'],
                'img': ['src', 'alt', 'title']
            }
            
            clean_html = bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attrs)
            note.content_html = clean_html
            note.save(update_fields=['content_html'])
    
    @action(detail=True, methods=['post'])
    def ai_assist(self, request, pk=None):
        """AI assistance for note creation and enhancement."""
        note = self.get_object()
        
        if not semantic_search_service.is_enabled():
            return Response({
                'error': 'AI assistance is not enabled. Set AI_PROVIDER environment variable.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        prompt = request.data.get('prompt', '')
        context_scope = request.data.get('context_scope', 'all')
        
        if not prompt:
            return Response({
                'error': 'Prompt is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get context based on scope
            context = self._get_context_for_ai(note.library_book, context_scope)
            
            # Generate AI response
            ai_response = self._generate_ai_response(prompt, context, note)
            
            return Response({
                'ai_response': ai_response,
                'context_scope': context_scope
            })
            
        except Exception as e:
            logger.error(f"AI assistance failed: {e}")
            return Response({
                'error': 'AI assistance failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_context_for_ai(self, library_book, context_scope):
        """Get context for AI assistance based on scope."""
        context = {
            'book_title': library_book.book.title,
            'book_authors': [author.name for author in library_book.book.authors.all()],
            'book_description': library_book.book.description or '',
        }
        
        if context_scope in ['notes', 'all']:
            # Get existing notes
            notes = Note.objects.filter(library_book=library_book).order_by('-created_at')
            context['existing_notes'] = [
                {
                    'title': note.title,
                    'content': note.content_markdown[:500] + '...' if len(note.content_markdown) > 500 else note.content_markdown
                }
                for note in notes[:5]  # Limit to 5 most recent notes
            ]
        
        if context_scope in ['files', 'all']:
            # Get extracted file text
            files = library_book.bookfile_set.filter(text_extracted=True)
            context['file_texts'] = [
                {
                    'file_type': file.file_type,
                    'text': file.extracted_text[:1000] + '...' if len(file.extracted_text) > 1000 else file.extracted_text
                }
                for file in files[:3]  # Limit to 3 files
            ]
        
        return context
    
    def _generate_ai_response(self, prompt, context, note):
        """Generate AI response based on prompt and context."""
        # This is a simplified implementation
        # In a real implementation, you'd use OpenAI's chat completion API
        
        if semantic_search_service.ai_provider == 'openai':
            try:
                import openai
                from django.conf import settings
                
                client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                
                # Build system message
                system_message = f"""You are an AI assistant helping with book notes. 
                
Book: {context['book_title']} by {', '.join(context['book_authors'])}
Description: {context['book_description']}

Your task is to help create or enhance notes based on the user's prompt. Be helpful, concise, and relevant to the book content."""
                
                # Build user message with context
                user_message = f"Prompt: {prompt}\n\n"
                
                if context.get('existing_notes'):
                    user_message += "Existing notes:\n"
                    for note_info in context['existing_notes']:
                        user_message += f"- {note_info['title']}: {note_info['content']}\n"
                
                if context.get('file_texts'):
                    user_message += "\nFile content:\n"
                    for file_info in context['file_texts']:
                        user_message += f"- {file_info['file_type']}: {file_info['text']}\n"
                
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": user_message}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                
                return response.choices[0].message.content
                
            except Exception as e:
                logger.error(f"OpenAI API call failed: {e}")
                return "AI assistance is currently unavailable. Please try again later."
        
        else:
            # Fallback for local provider or when OpenAI is not available
            return f"AI Response: Based on your prompt '{prompt}', here's a suggested note enhancement for '{context['book_title']}'..."


class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['library_book', 'rating']
    ordering_fields = ['created_at', 'rating']
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
            # Get overall rating
            overall_rating = Rating.objects.filter(library_book_id=library_book_id).first()
            
            # Get category ratings (via tags)
            from books.models import Tag
            from libraries.models import LibraryBookTag
            
            category_ratings = []
            library_book_tags = LibraryBookTag.objects.filter(library_book_id=library_book_id)
            
            for lb_tag in library_book_tags:
                # Check if there's a rating associated with this tag
                tag_rating = Rating.objects.filter(
                    library_book_id=library_book_id,
                    category=lb_tag.tag.name
                ).first()
                
                if tag_rating:
                    category_ratings.append({
                        'category': lb_tag.tag.name,
                        'rating': tag_rating.rating,
                        'created_at': tag_rating.created_at
                    })
            
            return Response({
                'overall_rating': overall_rating.rating if overall_rating else None,
                'category_ratings': category_ratings,
                'total_ratings': Rating.objects.filter(library_book_id=library_book_id).count()
            })
            
        except Exception as e:
            logger.error(f"Rating summary failed: {e}")
            return Response({'error': 'Failed to get rating summary'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def category_rating(self, request):
        """Set a category-specific rating."""
        library_book_id = request.data.get('library_book_id')
        category = request.data.get('category')
        rating_value = request.data.get('rating')
        
        if not all([library_book_id, category, rating_value]):
            return Response({
                'error': 'library_book_id, category, and rating are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rating_value = int(rating_value)
            if not 1 <= rating_value <= 5:
                return Response({'error': 'Rating must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create or update category rating
            rating, created = Rating.objects.update_or_create(
                library_book_id=library_book_id,
                category=category,
                defaults={'rating': rating_value}
            )
            
            return Response({
                'id': rating.id,
                'category': rating.category,
                'rating': rating.rating,
                'created': created
            })
            
        except ValueError:
            return Response({'error': 'Rating must be a number'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Category rating failed: {e}")
            return Response({'error': 'Failed to set category rating'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        if self.action in ['create', 'update', 'partial_update']:
            return ReviewCreateSerializer
        return ReviewSerializer
