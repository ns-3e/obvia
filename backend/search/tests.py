from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from books.models import Book, Author, Tag, Shelf
from libraries.models import Library, LibraryBook
from notes.models import Note, Rating, Review
from files.models import BookFile
from search.models import SearchEmbedding


class SearchAPITest(APITestCase):
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
        
        # Create a rating
        self.rating = Rating.objects.create(
            library_book=self.library_book,
            rating=5
        )
        
        # Create a review
        self.review = Review.objects.create(
            library_book=self.library_book,
            title="Test Review",
            body_markdown="This is a great book about programming"
        )

    def test_basic_search(self):
        """Test basic search functionality"""
        url = reverse('search-basic')
        response = self.client.get(url, {'q': 'programming'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should find results in book description, note content, and review
        self.assertIn('book_results', response.data)
        self.assertIn('note_results', response.data)
        self.assertIn('review_results', response.data)

    def test_basic_search_with_library_filter(self):
        """Test basic search with library filter"""
        url = reverse('search-basic')
        response = self.client.get(url, {
            'q': 'programming',
            'library_id': self.library.id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_basic_search_with_author_filter(self):
        """Test basic search with author filter"""
        url = reverse('search-basic')
        response = self.client.get(url, {
            'q': 'programming',
            'author': 'Test Author'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_basic_search_with_rating_filter(self):
        """Test basic search with rating filter"""
        url = reverse('search-basic')
        response = self.client.get(url, {
            'q': 'programming',
            'rating': '5'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_basic_search_empty_query(self):
        """Test basic search with empty query"""
        url = reverse('search-basic')
        response = self.client.get(url, {'q': ''})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_semantic_search_disabled(self):
        """Test semantic search when disabled"""
        url = reverse('search-semantic')
        response = self.client.post(url, {'query': 'programming'})
        # Should return 503 when AI provider is disabled
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_search_status(self):
        """Test search status endpoint"""
        url = reverse('search-status')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('enabled', response.data)
        self.assertIn('provider', response.data)

    def test_recommendations(self):
        """Test book recommendations"""
        # Create another book for recommendations
        book2 = Book.objects.create(
            title="Another Book",
            primary_isbn_13="9780987654321",
            description="Another test book",
            publisher="Test Publisher",
            language="en"
        )
        book2.authors.add(self.author)
        
        library_book2 = LibraryBook.objects.create(
            library=self.library,
            book=book2
        )
        
        url = reverse('search-recommendations')
        response = self.client.get(url, {
            'library_book_id': self.library_book.id,
            'limit': 5
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recommendations', response.data)

    def test_recommendations_without_library_book_id(self):
        """Test recommendations without library book ID"""
        url = reverse('search-recommendations')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SearchEmbeddingTest(TestCase):
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
        
        self.library = Library.objects.create(
            name="Test Library",
            description="A test library"
        )
        
        self.library_book = LibraryBook.objects.create(
            library=self.library,
            book=self.book
        )

    def test_search_embedding_creation(self):
        """Test creating a search embedding"""
        embedding = SearchEmbedding.objects.create(
            owner_type='book',
            owner_id=self.book.id,
            model='test-model',
            vector=b'test-vector-data'
        )
        self.assertEqual(embedding.owner_type, 'book')
        self.assertEqual(embedding.owner_id, self.book.id)
        self.assertEqual(embedding.model, 'test-model')

    def test_search_embedding_str_representation(self):
        """Test the string representation of a search embedding"""
        embedding = SearchEmbedding.objects.create(
            owner_type='book',
            owner_id=self.book.id,
            model='test-model',
            vector=b'test-vector-data'
        )
        self.assertEqual(str(embedding), f"book:{self.book.id} (test-model)")
