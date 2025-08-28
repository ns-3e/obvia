import json
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from libraries.models import Library, LibraryBook
from books.models import Book, Author, Tag, Shelf


class MassBookOperationsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test data
        self.author = Author.objects.create(name="Test Author")
        self.tag = Tag.objects.create(name="Test Tag")
        self.shelf = Shelf.objects.create(name="Test Shelf")
        
        # Create test libraries
        self.library1 = Library.objects.create(
            name="Test Library 1",
            description="First test library",
            is_system=False
        )
        
        self.library2 = Library.objects.create(
            name="Test Library 2",
            description="Second test library",
            is_system=False
        )
        
        # Create test books
        self.book1 = Book.objects.create(
            title="Test Book 1",
            primary_isbn_13="9781111111111",
            language="en",
            source="manual"
        )
        self.book1.authors.add(self.author)
        
        self.book2 = Book.objects.create(
            title="Test Book 2",
            primary_isbn_13="9782222222222",
            language="en",
            source="manual"
        )
        self.book2.authors.add(self.author)
        
        self.book3 = Book.objects.create(
            title="Test Book 3",
            primary_isbn_13="9783333333333",
            language="en",
            source="manual"
        )
        self.book3.authors.add(self.author)
        
        # Add books to library1
        self.library_book1 = LibraryBook.objects.create(
            library=self.library1,
            book=self.book1
        )
        self.library_book2 = LibraryBook.objects.create(
            library=self.library1,
            book=self.book2
        )

    def test_mass_add_books(self):
        """Test adding multiple books to a library."""
        url = reverse('library-mass-add-books', kwargs={'pk': self.library2.id})
        data = {
            'book_ids': [self.book1.id, self.book2.id, self.book3.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['added_books'], 3)
        self.assertEqual(response.data['skipped_books'], 0)
        
        # Verify books were added
        self.assertTrue(LibraryBook.objects.filter(library=self.library2, book=self.book1).exists())
        self.assertTrue(LibraryBook.objects.filter(library=self.library2, book=self.book2).exists())
        self.assertTrue(LibraryBook.objects.filter(library=self.library2, book=self.book3).exists())

    def test_mass_add_books_with_duplicates(self):
        """Test adding books that are already in the library."""
        # Add book1 to library2 first
        LibraryBook.objects.create(library=self.library2, book=self.book1)
        
        url = reverse('library-mass-add-books', kwargs={'pk': self.library2.id})
        data = {
            'book_ids': [self.book1.id, self.book2.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['added_books'], 1)  # Only book2 added
        self.assertEqual(response.data['skipped_books'], 1)  # book1 skipped

    def test_mass_remove_books(self):
        """Test removing multiple books from a library."""
        url = reverse('library-mass-remove-books', kwargs={'pk': self.library1.id})
        data = {
            'book_ids': [self.book1.id, self.book2.id],
            'move_to_unassigned': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['removed_books'], 0)
        self.assertEqual(response.data['moved_books'], 2)
        
        # Verify books were moved to unassigned library
        unassigned_library = Library.get_unassigned_library()
        self.assertTrue(LibraryBook.objects.filter(library=unassigned_library, book=self.book1).exists())
        self.assertTrue(LibraryBook.objects.filter(library=unassigned_library, book=self.book2).exists())

    def test_mass_remove_books_without_move_to_unassigned(self):
        """Test removing books without moving to unassigned."""
        url = reverse('library-mass-remove-books', kwargs={'pk': self.library1.id})
        data = {
            'book_ids': [self.book1.id],
            'move_to_unassigned': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['removed_books'], 1)
        self.assertEqual(response.data['moved_books'], 0)
        
        # Verify book was removed from library1
        self.assertFalse(LibraryBook.objects.filter(library=self.library1, book=self.book1).exists())

    def test_mass_move_books(self):
        """Test moving multiple books between libraries."""
        url = reverse('library-mass-move-books', kwargs={'pk': self.library1.id})
        data = {
            'target_library_id': self.library2.id,
            'book_ids': [self.book1.id, self.book2.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['moved_books'], 2)
        self.assertEqual(response.data['skipped_books'], 0)
        
        # Verify books were moved
        self.assertFalse(LibraryBook.objects.filter(library=self.library1, book=self.book1).exists())
        self.assertFalse(LibraryBook.objects.filter(library=self.library1, book=self.book2).exists())
        self.assertTrue(LibraryBook.objects.filter(library=self.library2, book=self.book1).exists())
        self.assertTrue(LibraryBook.objects.filter(library=self.library2, book=self.book2).exists())

    def test_mass_move_books_with_duplicates(self):
        """Test moving books to a library that already has some of them."""
        # Add book1 to library2 first
        LibraryBook.objects.create(library=self.library2, book=self.book1)
        
        url = reverse('library-mass-move-books', kwargs={'pk': self.library1.id})
        data = {
            'target_library_id': self.library2.id,
            'book_ids': [self.book1.id, self.book2.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['moved_books'], 1)  # Only book2 moved
        self.assertEqual(response.data['skipped_books'], 1)  # book1 skipped (already in target)

    def test_global_mass_add_operation(self):
        """Test global mass add operation."""
        url = reverse('library-mass-operations')
        data = {
            'operation_type': 'add_to_library',
            'target_library_id': self.library2.id,
            'book_ids': [self.book1.id, self.book2.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['added_books'], 2)
        self.assertEqual(response.data['skipped_books'], 0)

    def test_global_mass_remove_operation(self):
        """Test global mass remove operation."""
        url = reverse('library-mass-operations')
        data = {
            'operation_type': 'remove_from_library',
            'source_library_id': self.library1.id,
            'book_ids': [self.book1.id],
            'move_to_unassigned': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['removed_books'], 0)
        self.assertEqual(response.data['moved_books'], 1)

    def test_global_mass_move_operation(self):
        """Test global mass move operation."""
        url = reverse('library-mass-operations')
        data = {
            'operation_type': 'move_between_libraries',
            'source_library_id': self.library1.id,
            'target_library_id': self.library2.id,
            'book_ids': [self.book1.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['moved_books'], 1)
        self.assertEqual(response.data['skipped_books'], 0)

    def test_mass_add_books_invalid_data(self):
        """Test mass add with invalid data."""
        url = reverse('library-mass-add-books', kwargs={'pk': self.library1.id})
        
        # Test without book_ids
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with non-list book_ids
        response = self.client.post(url, {'book_ids': 'not_a_list'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mass_remove_books_invalid_data(self):
        """Test mass remove with invalid data."""
        url = reverse('library-mass-remove-books', kwargs={'pk': self.library1.id})
        
        # Test without book_ids
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mass_move_books_invalid_data(self):
        """Test mass move with invalid data."""
        url = reverse('library-mass-move-books', kwargs={'pk': self.library1.id})
        
        # Test without target_library_id
        response = self.client.post(url, {'book_ids': [self.book1.id]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test without book_ids
        response = self.client.post(url, {'target_library_id': self.library2.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mass_move_books_same_library(self):
        """Test moving books to the same library."""
        url = reverse('library-mass-move-books', kwargs={'pk': self.library1.id})
        data = {
            'target_library_id': self.library1.id,
            'book_ids': [self.book1.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mass_move_books_invalid_target_library(self):
        """Test moving books to a non-existent library."""
        url = reverse('library-mass-move-books', kwargs={'pk': self.library1.id})
        data = {
            'target_library_id': 99999,
            'book_ids': [self.book1.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_global_mass_operations_invalid_type(self):
        """Test global mass operations with invalid operation type."""
        url = reverse('library-mass-operations')
        data = {
            'operation_type': 'invalid_operation',
            'book_ids': [self.book1.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mass_operations_with_nonexistent_books(self):
        """Test mass operations with non-existent book IDs."""
        url = reverse('library-mass-add-books', kwargs={'pk': self.library2.id})
        data = {
            'book_ids': [99999, self.book1.id]  # One valid, one invalid
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['added_books'], 1)  # Only valid book added
        self.assertEqual(response.data['skipped_books'], 0)
        self.assertEqual(len(response.data['errors']), 1)  # One error for invalid book

    def test_mass_remove_books_not_in_library(self):
        """Test removing books that are not in the source library."""
        url = reverse('library-mass-remove-books', kwargs={'pk': self.library1.id})
        data = {
            'book_ids': [self.book3.id],  # book3 is not in library1
            'move_to_unassigned': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['removed_books'], 0)
        self.assertEqual(response.data['moved_books'], 0)
        self.assertEqual(len(response.data['errors']), 1)  # Error for book not in library

    def test_mass_move_books_not_in_source_library(self):
        """Test moving books that are not in the source library."""
        url = reverse('library-mass-move-books', kwargs={'pk': self.library1.id})
        data = {
            'target_library_id': self.library2.id,
            'book_ids': [self.book3.id]  # book3 is not in library1
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['moved_books'], 0)
        self.assertEqual(response.data['skipped_books'], 0)
        self.assertEqual(len(response.data['errors']), 1)  # Error for book not in source library
