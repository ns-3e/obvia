from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from books.models import Book, Author
from libraries.models import Library, LibraryBook
from notes.models import Note
from .models import SearchEmbedding


class SimpleSearchTest(TestCase):
    """Simple tests for search functionality"""
    
    def test_search_embedding_creation(self):
        """Test creating a search embedding"""
        author = Author.objects.create(name="Test Author")
        book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book",
            publisher="Test Publisher",
            language="en"
        )
        book.authors.add(author)
        
        embedding = SearchEmbedding.objects.create(
            owner_type='book',
            owner_id=book.id,
            model='test-model',
            vector=b'test-vector-data'
        )
        
        self.assertEqual(embedding.owner_type, 'book')
        self.assertEqual(embedding.owner_id, book.id)
        self.assertEqual(embedding.model, 'test-model')


class SimpleSearchAPITest(APITestCase):
    """Simple API tests for search"""
    
    def setUp(self):
        # Create test data
        self.author = Author.objects.create(name="Test Author")
        self.book = Book.objects.create(
            title="Test Book",
            primary_isbn_13="9781234567890",
            description="A test book about programming",
            publisher="Test Publisher",
            language="en"
        )
        self.book.authors.add(self.author)
        
        self.library = Library.objects.create(
            name="Test Library",
            description="A test library"
        )
        
        self.library_book = LibraryBook.objects.create(
            library=self.library,
            book=self.book
        )
        
        # Create a note
        self.note = Note.objects.create(
            library_book=self.library_book,
            title="Test Note",
            content_markdown="This is a test note about programming concepts"
        )

    def test_basic_search_endpoint_accessible(self):
        """Test that the basic search endpoint is accessible"""
        url = reverse('search-basic')
        response = self.client.get(url, {'q': 'programming'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_search_status_endpoint_accessible(self):
        """Test that the search status endpoint is accessible"""
        url = reverse('search-status')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_recommendations_endpoint_accessible(self):
        """Test that the recommendations endpoint is accessible"""
        url = reverse('search-recommendations')
        response = self.client.get(url, {'library_book_id': self.library_book.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_semantic_search_disabled(self):
        """Test semantic search when disabled"""
        url = reverse('search-semantic')
        response = self.client.post(url, {'query': 'programming'})
        # Should return 503 when AI provider is disabled
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
