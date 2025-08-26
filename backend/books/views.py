from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from .models import Book, Author, Tag, Shelf
from .serializers import (
    BookSerializer, BookCreateSerializer, AuthorSerializer,
    TagSerializer, ShelfSerializer
)
from ingest.clients import BookMetadataClient


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
