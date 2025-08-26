from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
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
