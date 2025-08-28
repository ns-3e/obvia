from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from .models import Book, Author, Tag, Shelf
from libraries.models import Library, LibraryBook
from notes.models import Rating, Review


class BookModelTest(TestCase):
    def setUp(self):
        self.author = Author.objects.create(name="Test Author")
        self.book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book",
            publisher="Test Publisher",
            language="en"
        )
        self.book.authors.add(self.author)

    def test_book_creation(self):
        """Test that a book can be created with required fields"""
        self.assertEqual(self.book.title, "Test Book")
        self.assertEqual(self.book.primary_isbn_13, "9781234567890")
        self.assertEqual(self.book.authors.count(), 1)
        self.assertEqual(self.book.authors.first().name, "Test Author")

    def test_book_str_representation(self):
        """Test the string representation of a book"""
        self.assertEqual(str(self.book), "Test Book")

    def test_author_str_representation(self):
        """Test the string representation of an author"""
        self.assertEqual(str(self.author), "Test Author")

    def test_book_with_multiple_authors(self):
        """Test that a book can have multiple authors"""
        author2 = Author.objects.create(name="Second Author")
        self.book.authors.add(author2)
        self.assertEqual(self.book.authors.count(), 2)

    def test_tag_creation(self):
        """Test tag creation"""
        tag = Tag.objects.create(name="Fiction")
        self.assertEqual(str(tag), "Fiction")

    def test_shelf_creation(self):
        """Test shelf creation"""
        shelf = Shelf.objects.create(
            name="Reading",
            is_system=True
        )
        self.assertEqual(str(shelf), "Reading")
        self.assertTrue(shelf.is_system)


class BookAPITest(APITestCase):
    def setUp(self):
        self.author = Author.objects.create(name="Test Author")
        self.book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book",
            publisher="Test Publisher",
            language="en"
        )
        self.book.authors.add(self.author)

    def test_get_books_list(self):
        """Test retrieving a list of books"""
        url = reverse('book-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that our test book is in the results
        book_titles = [book['title'] for book in response.data]
        self.assertIn("Test Book", book_titles)

    def test_get_book_detail(self):
        """Test retrieving a single book"""
        url = reverse('book-detail', args=[self.book.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Test Book")

    def test_create_book(self):
        """Test creating a new book"""
        url = reverse('book-list')
        data = {
            'title': 'New Book',
            'primary_isbn_13': '9780987654321',
            'description': 'A new test book',
            'publisher': 'New Publisher',
            'language': 'en'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Book.objects.count(), 2)
        self.assertEqual(Book.objects.get(title='New Book').title, 'New Book')

    def test_update_book(self):
        """Test updating a book"""
        url = reverse('book-detail', args=[self.book.id])
        data = {'title': 'Updated Book Title'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, 'Updated Book Title')

    def test_delete_book(self):
        """Test deleting a book"""
        url = reverse('book-detail', args=[self.book.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Book.objects.count(), 0)

    def test_book_lookup_endpoint(self):
        """Test the book lookup endpoint"""
        url = reverse('book-lookup')
        data = {'isbn': '9781234567890'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_book_ingest_endpoint(self):
        """Test the book ingest endpoint"""
        url = reverse('book-ingest')
        data = {'isbn': '9781234567890'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AuthorAPITest(APITestCase):
    def setUp(self):
        self.author = Author.objects.create(name="Test Author")

    def test_get_authors_list(self):
        """Test retrieving a list of authors"""
        url = reverse('author-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that our test author is in the results
        author_names = [author['name'] for author in response.data]
        self.assertIn("Test Author", author_names)

    def test_create_author(self):
        """Test creating a new author"""
        url = reverse('author-list')
        data = {'name': 'New Author'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Author.objects.count(), 2)


class TagAPITest(APITestCase):
    def setUp(self):
        self.tag = Tag.objects.create(name="Fiction")

    def test_get_tags_list(self):
        """Test retrieving a list of tags"""
        url = reverse('tag-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that our test tag is in the results
        tag_names = [tag['name'] for tag in response.data]
        self.assertIn("Fiction", tag_names)

    def test_create_tag(self):
        """Test creating a new tag"""
        url = reverse('tag-list')
        data = {'name': 'Non-Fiction'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Tag.objects.count(), 2)


class ShelfAPITest(APITestCase):
    def setUp(self):
        self.shelf = Shelf.objects.create(
            name="Reading",
            is_system=True
        )

    def test_get_shelves_list(self):
        """Test retrieving a list of shelves"""
        url = reverse('shelf-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that our test shelf is in the results
        shelf_names = [shelf['name'] for shelf in response.data['results']]
        self.assertIn("Reading", shelf_names)

    def test_get_system_shelves(self):
        """Test retrieving system shelves"""
        url = reverse('shelf-system-shelves')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_custom_shelves(self):
        """Test retrieving custom shelves"""
        url = reverse('shelf-custom-shelves')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)  # No custom shelves yet

    def test_create_shelf(self):
        """Test creating a new shelf"""
        url = reverse('shelf-list')
        data = {
            'name': 'Custom Shelf',
            'is_system': False
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Shelf.objects.count(), 2)
