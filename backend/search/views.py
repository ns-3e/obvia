from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from .models import SearchEmbedding
from .serializers import (
    SearchEmbeddingSerializer, BasicSearchSerializer,
    SemanticSearchSerializer, SearchResultSerializer
)
from books.models import Book
from libraries.models import LibraryBook
from notes.models import Note, Review
from files.models import BookFile
from .services import semantic_search_service


class SearchEmbeddingViewSet(viewsets.ModelViewSet):
    queryset = SearchEmbedding.objects.all()
    serializer_class = SearchEmbeddingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['owner_type', 'model']
    ordering_fields = ['created_at']
    ordering = ['-created_at']


class SearchViewSet(viewsets.ViewSet):
    """Search functionality for books, notes, and files."""

    @action(detail=False, methods=['get'])
    def basic(self, request):
        """Basic search across books, notes, and reviews."""
        serializer = BasicSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        
        query = serializer.validated_data.get('q', '')
        library_id = serializer.validated_data.get('library_id')
        author = serializer.validated_data.get('author')
        tag = serializer.validated_data.get('tag')
        rating = serializer.validated_data.get('rating')
        shelf = serializer.validated_data.get('shelf')
        
        if not query:
            return Response({'results': []})
        
        # Search in books with enhanced scoring
        book_results = []
        book_queryset = Book.objects.filter(
            Q(title__icontains=query) |
            Q(primary_isbn_13__icontains=query) |
            Q(isbn_10__icontains=query) |
            Q(authors__name__icontains=query) |
            Q(subtitle__icontains=query) |
            Q(description__icontains=query) |
            Q(publisher__icontains=query)
        ).distinct()
        
        # Apply additional filters
        if author:
            book_queryset = book_queryset.filter(authors__name__icontains=author)
        
        for book in book_queryset:
            # Check if book is in the specified library
            if library_id:
                library_book = LibraryBook.objects.filter(library_id=library_id, book=book).first()
                if not library_book:
                    continue
                
                # Apply tag filter
                if tag:
                    if not library_book.tags.filter(name__icontains=tag).exists():
                        continue
                
                # Apply rating filter
                if rating:
                    book_rating = library_book.ratings.first()
                    if not book_rating or book_rating.rating < int(rating):
                        continue
                
                # Apply shelf filter
                if shelf:
                    if not library_book.shelves.filter(name__icontains=shelf).exists():
                        continue
            else:
                library_book = None
            
            # Calculate relevance score
            score = self._calculate_book_score(book, query)
            
            # Create snippet
            snippet = self._create_book_snippet(book, query)
            
            book_results.append({
                'id': str(book.id),
                'title': book.title,
                'type': 'book',
                'score': score,
                'snippet': snippet,
                'url': f'/api/books/{book.id}/',
                'authors': [author.name for author in book.authors.all()],
                'library_book_id': str(library_book.id) if library_book else None
            })
        
        # Search in notes
        note_results = []
        note_queryset = Note.objects.filter(
            Q(title__icontains=query) |
            Q(content_markdown__icontains=query)
        )
        
        for note in note_queryset:
            if library_id:
                if note.library_book.library_id != library_id:
                    continue
            
            note_results.append({
                'id': str(note.id),
                'title': note.title,
                'type': 'note',
                'score': 0.8,
                'snippet': note.content_markdown[:200] + '...' if len(note.content_markdown) > 200 else note.content_markdown,
                'url': f'/api/notes/{note.id}/'
            })
        
        # Search in reviews
        review_results = []
        review_queryset = Review.objects.filter(
            Q(title__icontains=query) |
            Q(body_markdown__icontains=query)
        )
        
        for review in review_queryset:
            if library_id:
                if review.library_book.library_id != library_id:
                    continue
            
            review_results.append({
                'id': str(review.id),
                'title': review.title,
                'type': 'review',
                'score': 0.7,
                'snippet': review.body_markdown[:200] + '...' if len(review.body_markdown) > 200 else review.body_markdown,
                'url': f'/api/reviews/{review.id}/'
            })
        
        # Search in file text
        file_results = []
        file_queryset = BookFile.objects.filter(
            Q(text_extracted=True) &
            Q(extracted_text__icontains=query)
        )
        
        for book_file in file_queryset:
            if library_id:
                if book_file.library_book.library_id != library_id:
                    continue
            
            # Find the matching text snippet
            text = book_file.extracted_text
            query_lower = query.lower()
            text_lower = text.lower()
            
            # Find the position of the query in the text
            pos = text_lower.find(query_lower)
            if pos != -1:
                # Extract a snippet around the match
                start = max(0, pos - 100)
                end = min(len(text), pos + len(query) + 100)
                snippet = text[start:end]
                if start > 0:
                    snippet = '...' + snippet
                if end < len(text):
                    snippet = snippet + '...'
            else:
                snippet = text[:200] + '...' if len(text) > 200 else text
            
            file_results.append({
                'id': str(book_file.id),
                'title': f"{book_file.library_book.book.title} - {book_file.file_type.upper()}",
                'type': 'file_text',
                'score': 0.6,
                'snippet': snippet,
                'url': f'/api/files/{book_file.id}/'
            })
        
        # Combine and sort results
        all_results = book_results + note_results + review_results + file_results
        all_results.sort(key=lambda x: x['score'], reverse=True)
        
        return Response({'results': all_results})
    
    def _calculate_book_score(self, book, query):
        """Calculate relevance score for a book based on query."""
        query_lower = query.lower()
        score = 0.0
        
        # Title match (highest weight)
        if query_lower in book.title.lower():
            score += 10.0
            if book.title.lower().startswith(query_lower):
                score += 5.0  # Bonus for title starting with query
        
        # ISBN match (high weight)
        if query in (book.primary_isbn_13 or ''):
            score += 8.0
        if query in (book.isbn_10 or ''):
            score += 8.0
        
        # Author match (high weight)
        for author in book.authors.all():
            if query_lower in author.name.lower():
                score += 7.0
        
        # Subtitle match (medium weight)
        if book.subtitle and query_lower in book.subtitle.lower():
            score += 4.0
        
        # Description match (medium weight)
        if book.description and query_lower in book.description.lower():
            score += 3.0
        
        # Publisher match (low weight)
        if book.publisher and query_lower in book.publisher.lower():
            score += 2.0
        
        return score
    
    def _create_book_snippet(self, book, query):
        """Create a snippet highlighting the query match."""
        query_lower = query.lower()
        
        # Try to find the best matching field for snippet
        if query_lower in book.title.lower():
            return f"Title: {book.title}"
        elif book.subtitle and query_lower in book.subtitle.lower():
            return f"Subtitle: {book.subtitle}"
        elif book.description and query_lower in book.description.lower():
            desc = book.description
            pos = desc.lower().find(query_lower)
            start = max(0, pos - 50)
            end = min(len(desc), pos + len(query) + 50)
            snippet = desc[start:end]
            if start > 0:
                snippet = '...' + snippet
            if end < len(desc):
                snippet = snippet + '...'
            return f"Description: {snippet}"
        elif book.authors.filter(name__icontains=query).exists():
            authors = [author.name for author in book.authors.all()]
            return f"By: {', '.join(authors)}"
        else:
            return book.title

    @action(detail=False, methods=['post'])
    def semantic(self, request):
        """Semantic search using embeddings."""
        serializer = SemanticSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        query = serializer.validated_data.get('query')
        library_id = serializer.validated_data.get('library_id')
        top_k = serializer.validated_data.get('top_k', 10)
        
        # Check if semantic search is enabled
        if not semantic_search_service.is_enabled():
            return Response({
                'error': 'Semantic search is not enabled. Set AI_PROVIDER environment variable.',
                'enabled': False
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        try:
            # Perform semantic search
            results = semantic_search_service.search(query, library_id, top_k)
            
            # Format results for response
            formatted_results = []
            for result in results:
                snippet = semantic_search_service.create_snippet(
                    result['content'], query, max_length=200
                )
                
                formatted_results.append({
                    'id': result['id'],
                    'title': result['title'],
                    'type': result['type'],
                    'score': round(result['similarity_score'], 3),
                    'snippet': snippet,
                    'url': result['url']
                })
            
            return Response({
                'query': query,
                'results': formatted_results,
                'enabled': True,
                'provider': semantic_search_service.ai_provider
            })
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return Response({
                'error': 'Semantic search failed',
                'enabled': True
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get semantic search status and configuration."""
        return Response({
            'enabled': semantic_search_service.is_enabled(),
            'provider': semantic_search_service.ai_provider,
            'model': getattr(semantic_search_service, 'model', None) if semantic_search_service.is_enabled() else None
        })
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Get book recommendations based on metadata similarity."""
        library_book_id = request.query_params.get('library_book_id')
        limit = int(request.query_params.get('limit', 5))
        
        if not library_book_id:
            return Response(
                {'error': 'library_book_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            library_book = LibraryBook.objects.get(id=library_book_id)
            recommendations = self._get_book_recommendations(library_book, limit)
            return Response({'recommendations': recommendations})
        except LibraryBook.DoesNotExist:
            return Response(
                {'error': 'Library book not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _get_book_recommendations(self, library_book, limit=5):
        """Get book recommendations based on metadata similarity."""
        book = library_book.book
        recommendations = []
        
        # Get all books in the same library
        library_books = LibraryBook.objects.filter(library_id=library_book.library_id).exclude(id=library_book.id)
        
        scored_books = []
        for lb in library_books:
            score = self._calculate_similarity_score(book, lb.book)
            if score > 0:
                scored_books.append((lb, score))
        
        # Sort by score and take top results
        scored_books.sort(key=lambda x: x[1], reverse=True)
        
        for lb, score in scored_books[:limit]:
            recommendations.append({
                'id': str(lb.id),
                'book_id': str(lb.book.id),
                'title': lb.book.title,
                'authors': [author.name for author in lb.book.authors.all()],
                'similarity_score': round(score, 2),
                'similarity_reasons': self._get_similarity_reasons(book, lb.book),
                'cover_url': lb.book.cover_url,
                'url': f'/api/library-books/{lb.id}/'
            })
        
        return recommendations
    
    def _calculate_similarity_score(self, book1, book2):
        """Calculate similarity score between two books."""
        score = 0.0
        
        # Author similarity (highest weight)
        authors1 = set(author.name.lower() for author in book1.authors.all())
        authors2 = set(author.name.lower() for author in book2.authors.all())
        if authors1 and authors2:
            author_overlap = len(authors1.intersection(authors2))
            if author_overlap > 0:
                score += author_overlap * 10.0
        
        # Publisher similarity
        if book1.publisher and book2.publisher:
            if book1.publisher.lower() == book2.publisher.lower():
                score += 3.0
        
        # Language similarity
        if book1.language and book2.language:
            if book1.language.lower() == book2.language.lower():
                score += 2.0
        
        # Publication year similarity (within 5 years)
        if book1.publication_date and book2.publication_date:
            year1 = book1.publication_date.year
            year2 = book2.publication_date.year
            if abs(year1 - year2) <= 5:
                score += 2.0
        
        # Genre similarity (based on tags)
        # This would be enhanced when tags are more widely used
        
        return score
    
    def _get_similarity_reasons(self, book1, book2):
        """Get reasons why two books are similar."""
        reasons = []
        
        # Author similarity
        authors1 = set(author.name.lower() for author in book1.authors.all())
        authors2 = set(author.name.lower() for author in book2.authors.all())
        if authors1 and authors2:
            common_authors = authors1.intersection(authors2)
            if common_authors:
                reasons.append(f"Same author: {', '.join(common_authors)}")
        
        # Publisher similarity
        if book1.publisher and book2.publisher:
            if book1.publisher.lower() == book2.publisher.lower():
                reasons.append(f"Same publisher: {book1.publisher}")
        
        # Language similarity
        if book1.language and book2.language:
            if book1.language.lower() == book2.language.lower():
                reasons.append(f"Same language: {book1.language}")
        
        # Publication year similarity
        if book1.publication_date and book2.publication_date:
            year1 = book1.publication_date.year
            year2 = book2.publication_date.year
            if abs(year1 - year2) <= 5:
                reasons.append(f"Similar publication year: {year1} vs {year2}")
        
        return reasons
