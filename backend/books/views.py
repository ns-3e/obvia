from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from .models import Book, Author, Tag, Shelf, Chapter, Section, SubSection, PageRange
from .serializers import (
    BookSerializer, BookCreateSerializer, AuthorSerializer,
    TagSerializer, ShelfSerializer, ChapterSerializer, SectionSerializer,
    SubSectionSerializer, PageRangeSerializer, ChapterCreateSerializer,
    SectionCreateSerializer, SubSectionCreateSerializer, PageRangeCreateSerializer
)
from ingest.clients import BookMetadataClient
import requests
import json
import re
from typing import List, Dict, Optional


class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class ShelfViewSet(viewsets.ModelViewSet):
    queryset = Shelf.objects.all()
    serializer_class = ShelfSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_system']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    @action(detail=False, methods=['get'])
    def system_shelves(self, request):
        """Get system shelves (wishlist, reading, finished)."""
        system_shelves = Shelf.objects.filter(is_system=True).order_by('name')
        serializer = self.get_serializer(system_shelves, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def custom_shelves(self, request):
        """Get custom shelves (non-system)."""
        custom_shelves = Shelf.objects.filter(is_system=False).order_by('name')
        serializer = self.get_serializer(custom_shelves, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_book(self, request, pk=None):
        """Add a book to this shelf."""
        shelf = self.get_object()
        library_book_id = request.data.get('library_book_id')
        
        if not library_book_id:
            return Response({'error': 'library_book_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from libraries.models import ShelfItem, LibraryBook
            
            # Check if book is already on this shelf
            existing_item = ShelfItem.objects.filter(
                shelf=shelf,
                library_book_id=library_book_id
            ).first()
            
            if existing_item:
                return Response({'message': 'Book is already on this shelf'}, status=status.HTTP_200_OK)
            
            # Add book to shelf
            ShelfItem.objects.create(
                shelf=shelf,
                library_book_id=library_book_id
            )
            
            return Response({'message': 'Book added to shelf'}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': 'Failed to add book to shelf'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['delete'])
    def remove_book(self, request, pk=None):
        """Remove a book from this shelf."""
        shelf = self.get_object()
        library_book_id = request.data.get('library_book_id')
        
        if not library_book_id:
            return Response({'error': 'library_book_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from libraries.models import ShelfItem
            
            # Remove book from shelf
            deleted_count, _ = ShelfItem.objects.filter(
                shelf=shelf,
                library_book_id=library_book_id
            ).delete()
            
            if deleted_count > 0:
                return Response({'message': 'Book removed from shelf'}, status=status.HTTP_200_OK)
            else:
                return Response({'message': 'Book was not on this shelf'}, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({'error': 'Failed to remove book from shelf'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def books(self, request, pk=None):
        """Get all books on this shelf."""
        shelf = self.get_object()
        
        try:
            from libraries.models import ShelfItem
            from libraries.serializers import LibraryBookSerializer
            
            shelf_items = ShelfItem.objects.filter(shelf=shelf).select_related('library_book__book')
            library_books = [item.library_book for item in shelf_items]
            
            serializer = LibraryBookSerializer(library_books, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({'error': 'Failed to get shelf books'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['book']
    search_fields = ['title']
    ordering_fields = ['order', 'number', 'title', 'created_at']
    ordering = ['order', 'number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ChapterCreateSerializer
        return ChapterSerializer

    def get_queryset(self):
        queryset = Chapter.objects.all()
        book_id = self.request.query_params.get('book_id')
        if book_id:
            queryset = queryset.filter(book_id=book_id)
        return queryset


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['chapter']
    search_fields = ['title']
    ordering_fields = ['order', 'title', 'created_at']
    ordering = ['order']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SectionCreateSerializer
        return SectionSerializer

    def get_queryset(self):
        queryset = Section.objects.all()
        chapter_id = self.request.query_params.get('chapter_id')
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset


class SubSectionViewSet(viewsets.ModelViewSet):
    queryset = SubSection.objects.all()
    serializer_class = SubSectionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['section']
    search_fields = ['title']
    ordering_fields = ['order', 'title', 'created_at']
    ordering = ['order']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SubSectionCreateSerializer
        return SubSectionSerializer

    def get_queryset(self):
        queryset = SubSection.objects.all()
        section_id = self.request.query_params.get('section_id')
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        return queryset


class PageRangeViewSet(viewsets.ModelViewSet):
    queryset = PageRange.objects.all()
    serializer_class = PageRangeSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subsection', 'section', 'chapter']
    ordering_fields = ['start_page', 'end_page', 'created_at']
    ordering = ['start_page']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PageRangeCreateSerializer
        return PageRangeSerializer

    def get_queryset(self):
        queryset = PageRange.objects.all()
        subsection_id = self.request.query_params.get('subsection_id')
        section_id = self.request.query_params.get('section_id')
        chapter_id = self.request.query_params.get('chapter_id')
        
        if subsection_id:
            queryset = queryset.filter(subsection_id=subsection_id)
        elif section_id:
            queryset = queryset.filter(section_id=section_id)
        elif chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        
        return queryset


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['source', 'language']
    search_fields = ['title', 'primary_isbn_13', 'isbn_10', 'publisher']
    ordering_fields = ['title', 'publication_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BookCreateSerializer
        return BookSerializer

    @action(detail=False, methods=['post'])
    def lookup(self, request):
        """Lookup book by ISBN without saving."""
        isbn = request.data.get('isbn')
        if not isbn:
            return Response(
                {'error': 'ISBN is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find existing book
        book = Book.objects.filter(
            primary_isbn_13=isbn
        ).first() or Book.objects.filter(
            isbn_10=isbn
        ).first()
        
        if book:
            serializer = self.get_serializer(book)
            return Response(serializer.data)
        
        # Lookup from external APIs
        client = BookMetadataClient()
        metadata = client.lookup_by_isbn(isbn)
        
        if metadata:
            return Response(metadata)
        
        return Response({'message': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def ingest(self, request):
        """Create book from ISBN with metadata enrichment."""
        isbn = request.data.get('isbn')
        if not isbn:
            return Response(
                {'error': 'ISBN is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find existing book
        book = Book.objects.filter(
            primary_isbn_13=isbn
        ).first() or Book.objects.filter(
            isbn_10=isbn
        ).first()
        
        if book:
            serializer = self.get_serializer(book)
            return Response(serializer.data)
        
        # Lookup from external APIs and create book
        client = BookMetadataClient()
        metadata = client.lookup_by_isbn(isbn)
        
        if not metadata:
            return Response(
                {'error': 'Book not found in external APIs'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            with transaction.atomic():
                # Create or get authors
                authors = []
                for author_name in metadata.get('authors', []):
                    if author_name.strip():
                        author, created = Author.objects.get_or_create(name=author_name.strip())
                        authors.append(author)
                
                # Create book
                book_data = {
                    'primary_isbn_13': metadata.get('primary_isbn_13'),
                    'isbn_10': metadata.get('isbn_10'),
                    'title': metadata.get('title', ''),
                    'subtitle': metadata.get('subtitle'),
                    'description': metadata.get('description'),
                    'publisher': metadata.get('publisher'),
                    'publication_date': metadata.get('publication_date'),
                    'page_count': metadata.get('page_count'),
                    'language': metadata.get('language', 'en'),
                    'cover_url': metadata.get('cover_url'),
                    'source': metadata.get('source', 'manual')
                }
                
                # Remove None values
                book_data = {k: v for k, v in book_data.items() if v is not None}
                
                book = Book.objects.create(**book_data)
                book.authors.set(authors)
                
                serializer = self.get_serializer(book)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to create book: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def search_covers(self, request):
        """Search for book cover images from multiple sources."""
        title = request.data.get('title')
        author = request.data.get('author')
        isbn = request.data.get('isbn')
        
        if not title and not isbn:
            return Response(
                {'error': 'Title or ISBN is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        covers = []
        
        # Search Google Books API
        if title or isbn:
            try:
                google_covers = self._search_google_covers(title, author, isbn)
                covers.extend(google_covers)
            except Exception as e:
                print(f"Google Books cover search failed: {e}")
        
        # Search Open Library API
        if isbn:
            try:
                openlib_covers = self._search_openlib_covers(isbn)
                covers.extend(openlib_covers)
            except Exception as e:
                print(f"Open Library cover search failed: {e}")
        
        # Remove duplicates and limit results
        unique_covers = []
        seen_urls = set()
        for cover in covers:
            if cover['url'] not in seen_urls:
                unique_covers.append(cover)
                seen_urls.add(cover['url'])
        
        return Response({
            'covers': unique_covers[:10]  # Limit to 10 results
        })
    
    def _search_google_covers(self, title: str = None, author: str = None, isbn: str = None) -> List[Dict]:
        """Search Google Books API for cover images."""
        covers = []
        
        # Build search query
        query_parts = []
        if isbn:
            query_parts.append(f"isbn:{isbn}")
        if title:
            query_parts.append(f'"{title}"')
        if author:
            query_parts.append(f'"{author}"')
        
        query = " ".join(query_parts)
        
        try:
            url = "https://www.googleapis.com/books/v1/volumes"
            params = {
                'q': query,
                'maxResults': 5,
                'fields': 'items(volumeInfo(title,authors,imageLinks))'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'items' in data:
                for item in data['items']:
                    volume_info = item.get('volumeInfo', {})
                    image_links = volume_info.get('imageLinks', {})
                    
                    # Try different image sizes
                    for size in ['extraLarge', 'large', 'medium', 'small', 'thumbnail']:
                        if size in image_links:
                            covers.append({
                                'url': image_links[size].replace('http://', 'https://'),
                                'source': 'Google Books',
                                'title': volume_info.get('title', ''),
                                'authors': volume_info.get('authors', [])
                            })
                            break
        except Exception as e:
            print(f"Google Books API error: {e}")
        
        return covers
    
    def _search_openlib_covers(self, isbn: str) -> List[Dict]:
        """Search Open Library API for cover images."""
        covers = []
        
        try:
            # First get the book data
            url = f"https://openlibrary.org/api/books"
            params = {
                'bibkeys': f'ISBN:{isbn}',
                'format': 'json',
                'jscmd': 'data'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            book_key = f'ISBN:{isbn}'
            if book_key in data:
                book_data = data[book_key]
                covers_data = book_data.get('cover', [])
                
                for cover in covers_data:
                    if isinstance(cover, dict) and 'url' in cover:
                        covers.append({
                            'url': cover['url'],
                            'source': 'Open Library',
                            'title': book_data.get('title', ''),
                            'authors': [author.get('name', '') for author in book_data.get('authors', [])]
                        })
        except Exception as e:
            print(f"Open Library API error: {e}")
        
        return covers

    @action(detail=False, methods=['post'])
    def categorize(self, request):
        """Automatically categorize a book based on its metadata."""
        book_id = request.data.get('book_id')
        title = request.data.get('title')
        description = request.data.get('description')
        authors = request.data.get('authors', [])
        
        if not book_id and not title:
            return Response(
                {'error': 'Book ID or title is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get book data if book_id provided
        if book_id:
            try:
                book = Book.objects.get(id=book_id)
                title = book.title
                description = book.description
                authors = [author.name for author in book.authors.all()]
            except Book.DoesNotExist:
                return Response(
                    {'error': 'Book not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Generate categories based on content analysis
        categories = self._analyze_book_content(title, description, authors)
        
        return Response({
            'categories': categories,
            'confidence': self._calculate_confidence(categories)
        })
    
    def _analyze_book_content(self, title: str, description: str = None, authors: List[str] = None) -> List[str]:
        """Analyze book content to determine categories."""
        categories = []
        text_to_analyze = f"{title} {description or ''} {' '.join(authors or [])}".lower()
        
        # Define category keywords
        category_keywords = {
            'fiction': ['novel', 'story', 'tale', 'fiction', 'fantasy', 'mystery', 'romance', 'thriller', 'sci-fi', 'science fiction'],
            'non-fiction': ['non-fiction', 'nonfiction', 'biography', 'autobiography', 'memoir', 'history', 'science', 'philosophy'],
            'philosophy': ['philosophy', 'philosophical', 'ethics', 'metaphysics', 'epistemology', 'logic', 'moral', 'existential'],
            'science': ['science', 'scientific', 'physics', 'chemistry', 'biology', 'mathematics', 'research', 'experiment'],
            'history': ['history', 'historical', 'ancient', 'medieval', 'modern', 'war', 'battle', 'civilization'],
            'biography': ['biography', 'autobiography', 'memoir', 'life story', 'personal', 'diary'],
            'technology': ['technology', 'computer', 'software', 'programming', 'digital', 'internet', 'ai', 'artificial intelligence'],
            'business': ['business', 'management', 'economics', 'finance', 'marketing', 'entrepreneurship', 'leadership'],
            'self-help': ['self-help', 'personal development', 'motivation', 'success', 'happiness', 'mindfulness'],
            'religion': ['religion', 'religious', 'spiritual', 'theology', 'faith', 'bible', 'quran', 'meditation'],
            'politics': ['politics', 'political', 'government', 'policy', 'democracy', 'socialism', 'capitalism'],
            'psychology': ['psychology', 'psychological', 'mental health', 'behavior', 'mind', 'therapy', 'counseling'],
            'education': ['education', 'learning', 'teaching', 'academic', 'textbook', 'course', 'study'],
            'art': ['art', 'artistic', 'painting', 'sculpture', 'design', 'creative', 'aesthetic'],
            'literature': ['literature', 'literary', 'classic', 'poetry', 'drama', 'theater', 'play'],
            'travel': ['travel', 'journey', 'adventure', 'exploration', 'geography', 'culture', 'destination'],
            'cooking': ['cooking', 'recipe', 'food', 'culinary', 'kitchen', 'chef', 'gastronomy'],
            'health': ['health', 'medical', 'medicine', 'wellness', 'fitness', 'nutrition', 'diet'],
            'environment': ['environment', 'environmental', 'climate', 'ecology', 'sustainability', 'nature', 'conservation'],
            'sports': ['sports', 'athletic', 'fitness', 'game', 'competition', 'olympic', 'team']
        }
        
        # Score each category based on keyword matches
        category_scores = {}
        for category, keywords in category_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in text_to_analyze:
                    score += 1
            if score > 0:
                category_scores[category] = score
        
        # Sort by score and take top categories
        sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Add categories with score >= 1
        for category, score in sorted_categories[:5]:  # Limit to top 5
            if score >= 1:
                categories.append(category)
        
        # Add specific genre detection
        if 'fiction' in categories:
            # Detect sub-genres
            if any(word in text_to_analyze for word in ['fantasy', 'magic', 'wizard', 'dragon']):
                categories.append('fantasy')
            elif any(word in text_to_analyze for word in ['mystery', 'detective', 'crime', 'murder']):
                categories.append('mystery')
            elif any(word in text_to_analyze for word in ['romance', 'love', 'relationship']):
                categories.append('romance')
            elif any(word in text_to_analyze for word in ['thriller', 'suspense', 'action']):
                categories.append('thriller')
            elif any(word in text_to_analyze for word in ['sci-fi', 'science fiction', 'space', 'future']):
                categories.append('science-fiction')
        
        return list(set(categories))  # Remove duplicates
    
    def _calculate_confidence(self, categories: List[str]) -> float:
        """Calculate confidence score for categorization."""
        if not categories:
            return 0.0
        
        # Simple confidence based on number of categories found
        # More categories = higher confidence
        base_confidence = min(len(categories) * 0.2, 1.0)
        
        # Boost confidence for specific categories
        specific_categories = ['philosophy', 'science', 'history', 'biography', 'technology']
        specific_boost = sum(0.1 for cat in categories if cat in specific_categories)
        
        return min(base_confidence + specific_boost, 1.0)
