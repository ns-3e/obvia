from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Library, LibraryBook, LibraryBookTag, ShelfItem
from .serializers import (
    LibrarySerializer, LibraryBookSerializer, LibraryBookCreateSerializer,
    LibraryBookTagSerializer, ShelfItemSerializer
)
from books.models import Book, Tag, Shelf


class LibraryViewSet(viewsets.ModelViewSet):
    queryset = Library.objects.all()
    serializer_class = LibrarySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']

    def destroy(self, request, *args, **kwargs):
        """Delete library and move books to Unassigned library if they're not in other libraries."""
        library = self.get_object()
        
        # Prevent deletion of the "Unassigned" library
        if library.name == "Unassigned":
            return Response(
                {'error': 'The "Unassigned" library cannot be deleted'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Get or create the "Unassigned" library
            unassigned_library = Library.get_unassigned_library()
            
            # Get all books in this library
            library_books = LibraryBook.objects.filter(library=library)
            
            for library_book in library_books:
                book = library_book.book
                
                # Check if this book exists in other libraries
                other_libraries = LibraryBook.objects.filter(book=book).exclude(library=library)
                
                if not other_libraries.exists():
                    # Book is not in any other library, move it to Unassigned
                    library_book.library = unassigned_library
                    library_book.save()
                else:
                    # Book exists in other libraries, just remove it from this library
                    library_book.delete()
            
            # Delete the library
            library.delete()
            
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def books(self, request, pk=None):
        """Add a book to the library."""
        library = self.get_object()
        book_id = request.data.get('book_id')
        
        if not book_id:
            return Response(
                {'error': 'book_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response(
                {'error': 'Book not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if book is already in library
        if LibraryBook.objects.filter(library=library, book=book).exists():
            return Response(
                {'error': 'Book is already in this library'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        library_book = LibraryBook.objects.create(library=library, book=book)
        serializer = LibraryBookSerializer(library_book)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LibraryBookViewSet(viewsets.ModelViewSet):
    queryset = LibraryBook.objects.all()
    serializer_class = LibraryBookSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['library']
    search_fields = ['book__title', 'book__primary_isbn_13', 'custom_title']
    ordering_fields = ['added_at', 'book__title']
    ordering = ['-added_at']

    def get_queryset(self):
        queryset = LibraryBook.objects.all()
        library_id = self.request.query_params.get('library_id')
        if library_id:
            queryset = queryset.filter(library_id=library_id)
        return queryset

    def get_serializer_class(self):
        if self.action in ['create']:
            return LibraryBookCreateSerializer
        return LibraryBookSerializer

    @action(detail=True, methods=['post'])
    def add_tag(self, request, pk=None):
        """Add a tag to the library book."""
        library_book = self.get_object()
        tag_name = request.data.get('tag_name')
        
        if not tag_name:
            return Response(
                {'error': 'tag_name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tag, created = Tag.objects.get_or_create(name=tag_name.strip())
        library_book.tags.add(tag)
        
        serializer = LibraryBookSerializer(library_book)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_tag(self, request, pk=None):
        """Remove a tag from the library book."""
        library_book = self.get_object()
        tag_name = request.data.get('tag_name')
        
        if not tag_name:
            return Response(
                {'error': 'tag_name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tag = Tag.objects.get(name=tag_name)
            library_book.tags.remove(tag)
        except Tag.DoesNotExist:
            return Response(
                {'error': 'Tag not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = LibraryBookSerializer(library_book)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_from_library(self, request, pk=None):
        """Remove a book from the current library and move to Unassigned if not in other libraries."""
        library_book = self.get_object()
        book = library_book.book
        
        with transaction.atomic():
            # Check if book exists in other libraries
            other_libraries = LibraryBook.objects.filter(book=book).exclude(id=library_book.id)
            
            if not other_libraries.exists():
                # Book is not in other libraries, move it to Unassigned
                unassigned_library = Library.get_unassigned_library()
                library_book.library = unassigned_library
                library_book.save()
                return Response({
                    'message': f'Book "{book.title}" moved to Unassigned library',
                    'action': 'moved_to_unassigned'
                }, status=status.HTTP_200_OK)
            else:
                # Book exists in other libraries, just remove it from this library
                library_book.delete()
                return Response({
                    'message': f'Book "{book.title}" removed from library',
                    'action': 'removed_from_library'
                }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def add_to_shelf(self, request, pk=None):
        """Add the library book to a shelf."""
        library_book = self.get_object()
        shelf_name = request.data.get('shelf_name')
        
        if not shelf_name:
            return Response(
                {'error': 'shelf_name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shelf, created = Shelf.objects.get_or_create(name=shelf_name.strip())
        library_book.shelves.add(shelf)
        
        serializer = LibraryBookSerializer(library_book)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_from_shelf(self, request, pk=None):
        """Remove the library book from a shelf."""
        library_book = self.get_object()
        shelf_name = request.data.get('shelf_name')
        
        if not shelf_name:
            return Response(
                {'error': 'shelf_name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shelf = Shelf.objects.get(name=shelf_name)
            library_book.shelves.remove(shelf)
        except Shelf.DoesNotExist:
            return Response(
                {'error': 'Shelf not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = LibraryBookSerializer(library_book)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def delete_forever(self, request, pk=None):
        """Permanently delete a book from the application."""
        library_book = self.get_object()
        book = library_book.book
        book_title = book.title
        
        with transaction.atomic():
            # Delete all library book instances for this book
            LibraryBook.objects.filter(book=book).delete()
            
            # Delete related data (notes, ratings, reviews, files)
            from notes.models import Note, Rating, Review
            from files.models import BookFile
            
            Note.objects.filter(library_book__book=book).delete()
            Rating.objects.filter(library_book__book=book).delete()
            Review.objects.filter(library_book__book=book).delete()
            BookFile.objects.filter(library_book__book=book).delete()
            
            # Finally delete the book itself
            book.delete()
            
        return Response({
            'message': f'Book "{book_title}" permanently deleted from the application',
            'action': 'deleted_forever'
        }, status=status.HTTP_200_OK)
