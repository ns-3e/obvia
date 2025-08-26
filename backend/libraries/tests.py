from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Library, LibraryBook
from books.models import Book, Author, Tag
from notes.models import Rating


class LibraryModelTest(TestCase):
    def setUp(self):
        self.library = Library.objects.create(
            name="Test Library",
            description="A test library"
        )
        self.author = Author.objects.create(name="Test Author")
        self.book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book",
            publisher="Test Publisher",
            language="en"
        )
        self.book.authors.add(self.author)
        self.library_book = LibraryBook.objects.create(
            library=self.library,
            book=self.book
        )

    def test_library_creation(self):
        """Test that a library can be created"""
        self.assertEqual(self.library.name, "Test Library")
        self.assertEqual(self.library.description, "A test library")

    def test_library_str_representation(self):
        """Test the string representation of a library"""
        self.assertEqual(str(self.library), "Test Library")

    def test_library_book_creation(self):
        """Test that a library book can be created"""
        self.assertEqual(self.library_book.library, self.library)
        self.assertEqual(self.library_book.book, self.book)

    def test_library_book_str_representation(self):
        """Test the string representation of a library book"""
        self.assertEqual(str(self.library_book), "Test Book in Test Library")

    def test_library_books_relationship(self):
        """Test the relationship between library and books"""
        self.assertEqual(self.library.books.count(), 1)
        self.assertEqual(self.library.books.first(), self.book)

    def test_book_libraries_relationship(self):
        """Test the relationship between book and libraries"""
        self.assertEqual(self.book.libraries.count(), 1)
        self.assertEqual(self.book.libraries.first(), self.library)


class LibraryAPITest(APITestCase):
    def setUp(self):
        self.library = Library.objects.create(
            name="Test Library",
            description="A test library"
        )
        self.author = Author.objects.create(name="Test Author")
        self.book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book",
            publisher="Test Publisher",
            language="en"
        )
        self.book.authors.add(self.author)

    def test_get_libraries_list(self):
        """Test retrieving a list of libraries"""
        url = reverse('library-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Test Library")

    def test_get_library_detail(self):
        """Test retrieving a single library"""
        url = reverse('library-detail', args=[self.library.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Test Library")

    def test_create_library(self):
        """Test creating a new library"""
        url = reverse('library-list')
        data = {
            'name': 'New Library',
            'description': 'A new test library'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Library.objects.count(), 2)
        self.assertEqual(Library.objects.get(name='New Library').name, 'New Library')

    def test_update_library(self):
        """Test updating a library"""
        url = reverse('library-detail', args=[self.library.id])
        data = {'name': 'Updated Library Name'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.library.refresh_from_db()
        self.assertEqual(self.library.name, 'Updated Library Name')

    def test_delete_library(self):
        """Test deleting a library"""
        url = reverse('library-detail', args=[self.library.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Library.objects.count(), 0)

    def test_add_book_to_library(self):
        """Test adding a book to a library"""
        url = reverse('library-add-book', args=[self.library.id])
        data = {'book_id': self.book.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.library.books.count(), 1)

    def test_remove_book_from_library(self):
        """Test removing a book from a library"""
        # First add the book
        library_book = LibraryBook.objects.create(
            library=self.library,
            book=self.book
        )
        
        url = reverse('library-remove-book', args=[self.library.id, library_book.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.library.books.count(), 0)

    def test_get_library_books(self):
        """Test retrieving books in a library"""
        # Add a book to the library
        LibraryBook.objects.create(
            library=self.library,
            book=self.book
        )
        
        url = reverse('library-books', args=[self.library.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['book']['title'], "Test Book")


class LibraryBookAPITest(APITestCase):
    def setUp(self):
        self.library = Library.objects.create(
            name="Test Library",
            description="A test library"
        )
        self.author = Author.objects.create(name="Test Author")
        self.book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book",
            publisher="Test Publisher",
            language="en"
        )
        self.book.authors.add(self.author)
        self.library_book = LibraryBook.objects.create(
            library=self.library,
            book=self.book
        )

    def test_get_library_books_list(self):
        """Test retrieving a list of library books"""
        url = reverse('librarybook-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['book']['title'], "Test Book")

    def test_get_library_book_detail(self):
        """Test retrieving a single library book"""
        url = reverse('librarybook-detail', args=[self.library_book.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['book']['title'], "Test Book")

    def test_filter_library_books_by_library(self):
        """Test filtering library books by library"""
        url = reverse('librarybook-list')
        response = self.client.get(url, {'library': self.library.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_search_library_books(self):
        """Test searching library books"""
        url = reverse('librarybook-list')
        response = self.client.get(url, {'search': 'Test Book'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_filter_library_books_by_author(self):
        """Test filtering library books by author"""
        url = reverse('librarybook-list')
        response = self.client.get(url, {'author': 'Test Author'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
