import json
import tempfile
import os
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from libraries.models import Library, LibraryBook
from books.models import Book, Author, Tag, Shelf
from libraries.serializers import LibraryExportSerializer, LibraryImportSerializer


class LibraryImportExportTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test data
        self.author = Author.objects.create(name="Test Author")
        self.tag = Tag.objects.create(name="Test Tag")
        self.shelf = Shelf.objects.create(name="Test Shelf")
        
        # Create test library
        self.library = Library.objects.create(
            name="Test Library",
            description="A test library for import/export testing",
            is_system=False
        )
        
        # Create test book
        self.book = Book.objects.create(
            title="Test Book",
            subtitle="A Test Subtitle",
            description="A test book description",
            publisher="Test Publisher",
            primary_isbn_13="9781234567890",
            language="en",
            source="manual"
        )
        self.book.authors.add(self.author)
        
        # Create library book with custom data
        self.library_book = LibraryBook.objects.create(
            library=self.library,
            book=self.book,
            custom_title="Custom Book Title",
            custom_notes_summary="Custom notes for this book"
        )
        self.library_book.tags.add(self.tag)
        self.library_book.shelves.add(self.shelf)

    def test_export_library(self):
        """Test exporting a library to JSON."""
        url = reverse('library-export', kwargs={'pk': self.library.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/json')
        
        # Check that filename is set correctly
        self.assertIn('attachment; filename=', response['Content-Disposition'])
        
        # Parse the exported data
        data = json.loads(response.content)
        
        # Verify library data
        self.assertEqual(data['name'], "Test Library")
        self.assertEqual(data['description'], "A test library for import/export testing")
        self.assertFalse(data['is_system'])
        
        # Verify library books
        self.assertEqual(len(data['library_books']), 1)
        book_data = data['library_books'][0]
        
        # Verify book data
        self.assertEqual(book_data['book']['title'], "Test Book")
        self.assertEqual(book_data['book']['subtitle'], "A Test Subtitle")
        self.assertEqual(book_data['book']['primary_isbn_13'], "9781234567890")
        self.assertEqual(len(book_data['book']['authors']), 1)
        self.assertEqual(book_data['book']['authors'][0]['name'], "Test Author")
        
        # Verify custom data
        self.assertEqual(book_data['custom_title'], "Custom Book Title")
        self.assertEqual(book_data['custom_notes_summary'], "Custom notes for this book")
        
        # Verify tags and shelves
        self.assertEqual(len(book_data['tags']), 1)
        self.assertEqual(book_data['tags'][0]['name'], "Test Tag")
        self.assertEqual(len(book_data['shelves']), 1)
        self.assertEqual(book_data['shelves'][0]['name'], "Test Shelf")

    def test_export_system_library_fails(self):
        """Test that system libraries cannot be exported."""
        # Make the library a system library
        self.library.is_system = True
        self.library.save()
        
        url = reverse('library-export', kwargs={'pk': self.library.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('system library', response.data['error'])

    def test_import_library_from_file(self):
        """Test importing a library from a JSON file."""
        # Create export data
        export_data = {
            "name": "Imported Library",
            "description": "An imported library",
            "library_books": [
                {
                    "book": {
                        "title": "Imported Book",
                        "subtitle": "An imported book",
                        "description": "A book imported from JSON",
                        "publisher": "Imported Publisher",
                        "primary_isbn_13": "9780987654321",
                        "language": "en",
                        "source": "import",
                        "author_names": ["Imported Author"]
                    },
                    "custom_title": "Custom Imported Title",
                    "custom_notes_summary": "Custom notes for imported book",
                    "tags": ["Imported Tag"],
                    "shelves": ["Imported Shelf"]
                }
            ]
        }
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(export_data, f)
            f.flush()
            
            # Upload file
            with open(f.name, 'rb') as file:
                uploaded_file = SimpleUploadedFile(
                    "test_library.json",
                    file.read(),
                    content_type="application/json"
                )
                
                url = reverse('library-import-library')
                response = self.client.post(url, {'file': uploaded_file})
                
                # Clean up
                os.unlink(f.name)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify library was created
        imported_library = Library.objects.get(name="Imported Library")
        self.assertEqual(imported_library.description, "An imported library")
        self.assertFalse(imported_library.is_system)
        
        # Verify book was created
        imported_book = Book.objects.get(primary_isbn_13="9780987654321")
        self.assertEqual(imported_book.title, "Imported Book")
        self.assertEqual(imported_book.subtitle, "An imported book")
        
        # Verify author was created
        imported_author = Author.objects.get(name="Imported Author")
        self.assertIn(imported_author, imported_book.authors.all())
        
        # Verify library book was created
        imported_library_book = LibraryBook.objects.get(
            library=imported_library,
            book=imported_book
        )
        self.assertEqual(imported_library_book.custom_title, "Custom Imported Title")
        self.assertEqual(imported_library_book.custom_notes_summary, "Custom notes for imported book")
        
        # Verify tags and shelves were created
        imported_tag = Tag.objects.get(name="Imported Tag")
        self.assertIn(imported_tag, imported_library_book.tags.all())
        
        imported_shelf = Shelf.objects.get(name="Imported Shelf")
        self.assertIn(imported_shelf, imported_library_book.shelves.all())

    def test_import_library_with_existing_book(self):
        """Test importing a library with a book that already exists."""
        # Create a book that already exists
        existing_book = Book.objects.create(
            title="Existing Book",
            primary_isbn_13="9781111111111",
            language="en",
            source="manual"
        )
        
        # Create import data with the same ISBN
        import_data = {
            "name": "Library with Existing Book",
            "description": "A library with an existing book",
            "library_books": [
                {
                    "book": {
                        "title": "Different Title",  # Different title but same ISBN
                        "primary_isbn_13": "9781111111111",
                        "language": "en",
                        "source": "import"
                    },
                    "custom_title": "Custom Title for Existing Book",
                    "tags": ["New Tag"],
                    "shelves": ["New Shelf"]
                }
            ]
        }
        
        url = reverse('library-import-library')
        response = self.client.post(url, import_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the existing book was used (not duplicated)
        self.assertEqual(Book.objects.filter(primary_isbn_13="9781111111111").count(), 1)
        
        # Verify library book was created with the existing book
        imported_library = Library.objects.get(name="Library with Existing Book")
        library_book = LibraryBook.objects.get(library=imported_library, book=existing_book)
        self.assertEqual(library_book.custom_title, "Custom Title for Existing Book")

    def test_import_library_duplicate_name_fails(self):
        """Test that importing a library with a duplicate name fails."""
        import_data = {
            "name": "Test Library",  # Same name as existing library
            "description": "A duplicate library",
            "library_books": []
        }
        
        url = reverse('library-import-library')
        response = self.client.post(url, import_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.data['error'])

    def test_import_library_invalid_json_fails(self):
        """Test that importing invalid JSON fails."""
        # Create invalid JSON file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{"invalid": json}')
            f.flush()
            
            with open(f.name, 'rb') as file:
                uploaded_file = SimpleUploadedFile(
                    "invalid.json",
                    file.read(),
                    content_type="application/json"
                )
                
                url = reverse('library-import-library')
                response = self.client.post(url, {'file': uploaded_file})
                
                os.unlink(f.name)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid JSON', response.data['error'])

    def test_import_library_wrong_file_type_fails(self):
        """Test that importing non-JSON files fails."""
        # Create a text file instead of JSON
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write('This is not JSON')
            f.flush()
            
            with open(f.name, 'rb') as file:
                uploaded_file = SimpleUploadedFile(
                    "test.txt",
                    file.read(),
                    content_type="text/plain"
                )
                
                url = reverse('library-import-library')
                response = self.client.post(url, {'file': uploaded_file})
                
                os.unlink(f.name)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Only JSON files', response.data['error'])

    def test_import_library_partial_failure(self):
        """Test that import continues even if some books fail."""
        import_data = {
            "name": "Library with Mixed Books",
            "description": "A library with some valid and invalid books",
            "library_books": [
                {
                    "book": {
                        "title": "Valid Book",
                        "primary_isbn_13": "9782222222222",
                        "language": "en",
                        "source": "import"
                    },
                    "tags": ["Valid Tag"]
                },
                {
                    "book": {
                        "title": "",  # Invalid: empty title
                        "primary_isbn_13": "9783333333333",
                        "language": "en",
                        "source": "import"
                    }
                },
                {
                    "book": {
                        "title": "Another Valid Book",
                        "primary_isbn_13": "9784444444444",
                        "language": "en",
                        "source": "import"
                    }
                }
            ]
        }
        
        url = reverse('library-import-library')
        response = self.client.post(url, import_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify library was created
        imported_library = Library.objects.get(name="Library with Mixed Books")
        
        # Verify only valid books were imported
        library_books = LibraryBook.objects.filter(library=imported_library)
        self.assertEqual(library_books.count(), 2)  # Only 2 valid books
        
        # Verify errors were reported
        self.assertIn('errors', response.data)
        self.assertTrue(len(response.data['errors']) > 0)

    def test_export_serializer(self):
        """Test the LibraryExportSerializer directly."""
        serializer = LibraryExportSerializer(self.library)
        data = serializer.data
        
        self.assertEqual(data['name'], "Test Library")
        self.assertEqual(len(data['library_books']), 1)
        self.assertEqual(data['library_books'][0]['book']['title'], "Test Book")

    def test_import_serializer_validation(self):
        """Test the LibraryImportSerializer validation."""
        # Valid data
        valid_data = {
            "name": "New Library",
            "description": "A new library",
            "library_books": []
        }
        serializer = LibraryImportSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())
        
        # Invalid data - duplicate name
        invalid_data = {
            "name": "Test Library",  # Already exists
            "description": "A duplicate library",
            "library_books": []
        }
        serializer = LibraryImportSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
