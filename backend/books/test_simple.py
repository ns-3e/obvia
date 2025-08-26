from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Book, Author, Tag, Shelf


class SimpleBookTest(TestCase):
    """Simple tests for book functionality"""
    
    def test_book_creation(self):
        """Test that a book can be created"""
        author = Author.objects.create(name="Test Author")
        book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book",
            publisher="Test Publisher",
            language="en"
        )
        book.authors.add(author)
        
        self.assertEqual(book.title, "Test Book")
        self.assertEqual(book.authors.count(), 1)
        self.assertEqual(book.authors.first().name, "Test Author")

    def test_author_creation(self):
        """Test that an author can be created"""
        author = Author.objects.create(name="Test Author")
        self.assertEqual(author.name, "Test Author")

    def test_tag_creation(self):
        """Test that a tag can be created"""
        tag = Tag.objects.create(name="Fiction")
        self.assertEqual(tag.name, "Fiction")

    def test_shelf_creation(self):
        """Test that a shelf can be created"""
        shelf = Shelf.objects.create(name="Reading", is_system=True)
        self.assertEqual(shelf.name, "Reading")
        self.assertTrue(shelf.is_system)


class SimpleAPITest(APITestCase):
    """Simple API tests"""
    
    def test_books_endpoint_accessible(self):
        """Test that the books endpoint is accessible"""
        url = reverse('book-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authors_endpoint_accessible(self):
        """Test that the authors endpoint is accessible"""
        url = reverse('author-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_tags_endpoint_accessible(self):
        """Test that the tags endpoint is accessible"""
        url = reverse('tag-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_shelves_endpoint_accessible(self):
        """Test that the shelves endpoint is accessible"""
        url = reverse('shelf-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_book(self):
        """Test creating a book via API"""
        url = reverse('book-list')
        data = {
            'title': 'API Test Book',
            'primary_isbn_13': '9781111111111',
            'description': 'A book created via API',
            'publisher': 'Test Publisher',
            'language': 'en'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Book.objects.count(), 1)
        self.assertEqual(Book.objects.first().title, 'API Test Book')

    def test_create_author(self):
        """Test creating an author via API"""
        url = reverse('author-list')
        data = {'name': 'API Test Author'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Author.objects.count(), 1)
        self.assertEqual(Author.objects.first().name, 'API Test Author')
