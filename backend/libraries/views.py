from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.http import JsonResponse
from django.core.exceptions import ValidationError
import json
from datetime import datetime
from .models import Library, LibraryBook, LibraryBookTag, ShelfItem
from .serializers import (
    LibrarySerializer, LibraryBookSerializer, LibraryBookCreateSerializer,
    LibraryBookTagSerializer, ShelfItemSerializer, LibraryExportSerializer,
    LibraryImportSerializer, BookImportSerializer
)
from books.models import Book, Tag, Shelf, Author
from books.serializers import BookCreateSerializer


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
        
        # Prevent deletion of system libraries
        if library.is_system:
            return Response(
                {'error': f'The "{library.name}" library is a system library and cannot be deleted'}, 
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

    @action(detail=True, methods=['post'])
    def mass_add_books(self, request, pk=None):
        """Add multiple books to the library."""
        library = self.get_object()
        book_ids = request.data.get('book_ids', [])
        
        if not book_ids:
            return Response(
                {'error': 'book_ids is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(book_ids, list):
            return Response(
                {'error': 'book_ids must be a list'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            added_books = 0
            skipped_books = 0
            errors = []
            
            for book_id in book_ids:
                try:
                    book = Book.objects.get(id=book_id)
                    
                    # Check if book is already in library
                    if LibraryBook.objects.filter(library=library, book=book).exists():
                        skipped_books += 1
                        continue
                    
                    LibraryBook.objects.create(library=library, book=book)
                    added_books += 1
                    
                except Book.DoesNotExist:
                    errors.append(f"Book with ID {book_id} not found")
                except Exception as e:
                    errors.append(f"Error adding book {book_id}: {str(e)}")
            
            return Response({
                'message': f'Mass add operation completed for library "{library.name}"',
                'added_books': added_books,
                'skipped_books': skipped_books,
                'errors': errors if errors else None
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mass_remove_books(self, request, pk=None):
        """Remove multiple books from the library."""
        library = self.get_object()
        book_ids = request.data.get('book_ids', [])
        move_to_unassigned = request.data.get('move_to_unassigned', True)
        
        if not book_ids:
            return Response(
                {'error': 'book_ids is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(book_ids, list):
            return Response(
                {'error': 'book_ids must be a list'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            removed_books = 0
            moved_books = 0
            errors = []
            unassigned_library = Library.get_unassigned_library()
            
            for book_id in book_ids:
                try:
                    book = Book.objects.get(id=book_id)
                    library_book = LibraryBook.objects.filter(library=library, book=book).first()
                    
                    if not library_book:
                        errors.append(f"Book with ID {book_id} is not in this library")
                        continue
                    
                    if move_to_unassigned:
                        # Check if book exists in other libraries
                        other_libraries = LibraryBook.objects.filter(book=book).exclude(library=library)
                        
                        if not other_libraries.exists():
                            # Book is not in other libraries, move it to Unassigned
                            library_book.library = unassigned_library
                            library_book.save()
                            moved_books += 1
                        else:
                            # Book exists in other libraries, just remove it from this library
                            library_book.delete()
                            removed_books += 1
                    else:
                        # Just remove from this library
                        library_book.delete()
                        removed_books += 1
                    
                except Book.DoesNotExist:
                    errors.append(f"Book with ID {book_id} not found")
                except Exception as e:
                    errors.append(f"Error removing book {book_id}: {str(e)}")
            
            return Response({
                'message': f'Mass remove operation completed for library "{library.name}"',
                'removed_books': removed_books,
                'moved_books': moved_books,
                'errors': errors if errors else None
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mass_move_books(self, request, pk=None):
        """Move multiple books from this library to another library."""
        library = self.get_object()
        target_library_id = request.data.get('target_library_id')
        book_ids = request.data.get('book_ids', [])
        
        if not target_library_id:
            return Response(
                {'error': 'target_library_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not book_ids:
            return Response(
                {'error': 'book_ids is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(book_ids, list):
            return Response(
                {'error': 'book_ids must be a list'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_library = Library.objects.get(id=target_library_id)
        except Library.DoesNotExist:
            return Response(
                {'error': 'Target library not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if target_library.id == library.id:
            return Response(
                {'error': 'Cannot move books to the same library'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            moved_books = 0
            skipped_books = 0
            errors = []
            
            for book_id in book_ids:
                try:
                    book = Book.objects.get(id=book_id)
                    library_book = LibraryBook.objects.filter(library=library, book=book).first()
                    
                    if not library_book:
                        errors.append(f"Book with ID {book_id} is not in this library")
                        continue
                    
                    # Check if book is already in target library
                    if LibraryBook.objects.filter(library=target_library, book=book).exists():
                        # Book already exists in target library, just remove from source
                        library_book.delete()
                        skipped_books += 1
                    else:
                        # Move book to target library
                        library_book.library = target_library
                        library_book.save()
                        moved_books += 1
                    
                except Book.DoesNotExist:
                    errors.append(f"Book with ID {book_id} not found")
                except Exception as e:
                    errors.append(f"Error moving book {book_id}: {str(e)}")
            
            return Response({
                'message': f'Mass move operation completed from "{library.name}" to "{target_library.name}"',
                'moved_books': moved_books,
                'skipped_books': skipped_books,
                'errors': errors if errors else None
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """Export a library with all its books and metadata."""
        library = self.get_object()
        
        # Prevent export of system libraries
        if library.is_system:
            return Response(
                {'error': f'The "{library.name}" library is a system library and cannot be exported'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LibraryExportSerializer(library)
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{library.name.replace(' ', '_')}_{timestamp}.json"
        
        response = JsonResponse(serializer.data, json_dumps_params={'indent': 2})
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Type'] = 'application/json'
        
        return response

    @action(detail=False, methods=['post'])
    def mass_operations(self, request):
        """Global mass book operations across libraries."""
        operation_type = request.data.get('operation_type')
        source_library_id = request.data.get('source_library_id')
        target_library_id = request.data.get('target_library_id')
        book_ids = request.data.get('book_ids', [])
        
        if not operation_type:
            return Response(
                {'error': 'operation_type is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not book_ids:
            return Response(
                {'error': 'book_ids is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(book_ids, list):
            return Response(
                {'error': 'book_ids must be a list'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            if operation_type == 'add_to_library':
                if not target_library_id:
                    return Response(
                        {'error': 'target_library_id is required for add operation'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    target_library = Library.objects.get(id=target_library_id)
                except Library.DoesNotExist:
                    return Response(
                        {'error': 'Target library not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                added_books = 0
                skipped_books = 0
                errors = []
                
                for book_id in book_ids:
                    try:
                        book = Book.objects.get(id=book_id)
                        
                        # Check if book is already in library
                        if LibraryBook.objects.filter(library=target_library, book=book).exists():
                            skipped_books += 1
                            continue
                        
                        LibraryBook.objects.create(library=target_library, book=book)
                        added_books += 1
                        
                    except Book.DoesNotExist:
                        errors.append(f"Book with ID {book_id} not found")
                    except Exception as e:
                        errors.append(f"Error adding book {book_id}: {str(e)}")
                
                return Response({
                    'message': f'Mass add operation completed for library "{target_library.name}"',
                    'added_books': added_books,
                    'skipped_books': skipped_books,
                    'errors': errors if errors else None
                }, status=status.HTTP_200_OK)
            
            elif operation_type == 'remove_from_library':
                if not source_library_id:
                    return Response(
                        {'error': 'source_library_id is required for remove operation'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    source_library = Library.objects.get(id=source_library_id)
                except Library.DoesNotExist:
                    return Response(
                        {'error': 'Source library not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                move_to_unassigned = request.data.get('move_to_unassigned', True)
                removed_books = 0
                moved_books = 0
                errors = []
                unassigned_library = Library.get_unassigned_library()
                
                for book_id in book_ids:
                    try:
                        book = Book.objects.get(id=book_id)
                        library_book = LibraryBook.objects.filter(library=source_library, book=book).first()
                        
                        if not library_book:
                            errors.append(f"Book with ID {book_id} is not in the source library")
                            continue
                        
                        if move_to_unassigned:
                            # Check if book exists in other libraries
                            other_libraries = LibraryBook.objects.filter(book=book).exclude(library=source_library)
                            
                            if not other_libraries.exists():
                                # Book is not in other libraries, move it to Unassigned
                                library_book.library = unassigned_library
                                library_book.save()
                                moved_books += 1
                            else:
                                # Book exists in other libraries, just remove it from source library
                                library_book.delete()
                                removed_books += 1
                        else:
                            # Just remove from source library
                            library_book.delete()
                            removed_books += 1
                        
                    except Book.DoesNotExist:
                        errors.append(f"Book with ID {book_id} not found")
                    except Exception as e:
                        errors.append(f"Error removing book {book_id}: {str(e)}")
                
                return Response({
                    'message': f'Mass remove operation completed for library "{source_library.name}"',
                    'removed_books': removed_books,
                    'moved_books': moved_books,
                    'errors': errors if errors else None
                }, status=status.HTTP_200_OK)
            
            elif operation_type == 'move_between_libraries':
                if not source_library_id or not target_library_id:
                    return Response(
                        {'error': 'Both source_library_id and target_library_id are required for move operation'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    source_library = Library.objects.get(id=source_library_id)
                    target_library = Library.objects.get(id=target_library_id)
                except Library.DoesNotExist:
                    return Response(
                        {'error': 'Source or target library not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                if source_library.id == target_library.id:
                    return Response(
                        {'error': 'Cannot move books to the same library'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                moved_books = 0
                skipped_books = 0
                errors = []
                
                for book_id in book_ids:
                    try:
                        book = Book.objects.get(id=book_id)
                        library_book = LibraryBook.objects.filter(library=source_library, book=book).first()
                        
                        if not library_book:
                            errors.append(f"Book with ID {book_id} is not in the source library")
                            continue
                        
                        # Check if book is already in target library
                        if LibraryBook.objects.filter(library=target_library, book=book).exists():
                            # Book already exists in target library, just remove from source
                            library_book.delete()
                            skipped_books += 1
                        else:
                            # Move book to target library
                            library_book.library = target_library
                            library_book.save()
                            moved_books += 1
                        
                    except Book.DoesNotExist:
                        errors.append(f"Book with ID {book_id} not found")
                    except Exception as e:
                        errors.append(f"Error moving book {book_id}: {str(e)}")
                
                return Response({
                    'message': f'Mass move operation completed from "{source_library.name}" to "{target_library.name}"',
                    'moved_books': moved_books,
                    'skipped_books': skipped_books,
                    'errors': errors if errors else None
                }, status=status.HTTP_200_OK)
            
            else:
                return Response(
                    {'error': f'Invalid operation_type: {operation_type}. Supported types: add_to_library, remove_from_library, move_between_libraries'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=False, methods=['post'])
    def import_library(self, request):
        """Import a library from JSON data."""
        try:
            # Handle both file upload and direct JSON data
            if 'file' in request.FILES:
                # File upload
                file = request.FILES['file']
                if not file.name.endswith('.json'):
                    return Response(
                        {'error': f'Only JSON files are supported. Received: {file.name}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    import_data = json.loads(file.read().decode('utf-8'))
                except json.JSONDecodeError as e:
                    return Response(
                        {'error': f'Invalid JSON file: {str(e)}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                except UnicodeDecodeError as e:
                    return Response(
                        {'error': f'File encoding error: {str(e)}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Direct JSON data
                import_data = request.data
            
            # Validate the import data
            library_serializer = LibraryImportSerializer(data=import_data)
            if not library_serializer.is_valid():
                # Create a more specific error message
                error_details = library_serializer.errors
                error_message = 'Invalid library data'
                
                # Provide specific error messages for common issues
                if 'name' in error_details:
                    if 'already exists' in str(error_details['name']):
                        error_message = f"A library with the name '{import_data.get('name', 'Unknown')}' already exists"
                        # Don't include redundant details for this common case
                        return Response(
                            {'error': error_message}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    else:
                        error_message = f"Invalid library name: {error_details['name'][0]}"
                elif 'library_books' in error_details:
                    error_message = "Invalid book data in the import file"
                
                return Response(
                    {'error': error_message, 'details': error_details}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Create the library
                library_data = library_serializer.validated_data
                library = Library.objects.create(
                    name=library_data['name'],
                    description=library_data.get('description', ''),
                    is_system=False  # Imported libraries are never system libraries
                )
                
                # Import books
                imported_books = 0
                skipped_books = 0
                errors = []
                
                for book_data in library_data.get('library_books', []):
                    try:
                        # Extract book information from the nested structure
                        book_info = book_data.get('book', {})
                        if not book_info:
                            errors.append("Book data missing 'book' field")
                            continue
                        
                        # Validate book data
                        book_serializer = BookImportSerializer(data=book_info)
                        if not book_serializer.is_valid():
                            errors.append(f"Book '{book_info.get('title', 'Unknown')}': {book_serializer.errors}")
                            continue
                        
                        validated_book_data = book_serializer.validated_data
                        
                        # Check if book already exists (by ISBN or title)
                        existing_book = None
                        if validated_book_data.get('primary_isbn_13'):
                            existing_book = Book.objects.filter(
                                primary_isbn_13=validated_book_data['primary_isbn_13']
                            ).first()
                        elif validated_book_data.get('isbn_10'):
                            existing_book = Book.objects.filter(
                                isbn_10=validated_book_data['isbn_10']
                            ).first()
                        
                        if not existing_book:
                            # Create new book
                            book_create_data = {k: v for k, v in validated_book_data.items() 
                                              if k not in ['tags', 'shelves', 'custom_title', 'custom_notes_summary']}
                            
                            # Handle author_names properly
                            author_names = validated_book_data.get('author_names', [])
                            if author_names:
                                book_create_data['author_names'] = author_names
                            
                            book_serializer = BookCreateSerializer(data=book_create_data)
                            if book_serializer.is_valid():
                                book = book_serializer.save()
                            else:
                                errors.append(f"Book '{validated_book_data.get('title', 'Unknown')}': {book_serializer.errors}")
                                continue
                        else:
                            book = existing_book
                            skipped_books += 1
                        
                        # Create library book entry
                        library_book = LibraryBook.objects.create(
                            library=library,
                            book=book,
                            custom_title=book_data.get('custom_title'),
                            custom_notes_summary=book_data.get('custom_notes_summary')
                        )
                        
                        # Add tags
                        for tag_name in book_data.get('tags', []):
                            tag, created = Tag.objects.get_or_create(name=tag_name.strip())
                            library_book.tags.add(tag)
                        
                        # Add shelves
                        for shelf_name in book_data.get('shelves', []):
                            shelf, created = Shelf.objects.get_or_create(name=shelf_name.strip())
                            library_book.shelves.add(shelf)
                        
                        imported_books += 1
                        
                    except Exception as e:
                        errors.append(f"Book '{book_data.get('title', 'Unknown')}': {str(e)}")
                        continue
                
                # Return success response with summary
                return Response({
                    'message': f'Library "{library.name}" imported successfully',
                    'library_id': library.id,
                    'imported_books': imported_books,
                    'skipped_books': skipped_books,
                    'errors': errors if errors else None
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            # Log the full error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Library import failed: {str(e)}', exc_info=True)
            
            # Return a user-friendly error message
            return Response(
                {'error': f'Import failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
