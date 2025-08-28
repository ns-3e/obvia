# Books Module Interface

## Purpose
The books module serves as the core data management system for book entities in Obvia. It handles book metadata, author relationships, and provides the foundation for all book-related operations across the application.

## Responsibilities
- **Book Entity Management**: Core book data model with normalized metadata
- **Author Relationship Management**: Many-to-many relationships between books and authors
- **Metadata Normalization**: Standardization of book data from various sources
- **ISBN Validation**: Validation and normalization of ISBN formats
- **External API Integration**: Coordination with metadata enrichment services
- **Data Persistence**: Database operations for book entities

## Key Models

### Book
```python
class Book(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    primary_isbn_13 = models.CharField(max_length=13, unique=True)
    isbn_10 = models.CharField(max_length=10, blank=True)
    title = models.CharField(max_length=500)
    subtitle = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    publisher = models.CharField(max_length=200, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    page_count = models.IntegerField(null=True, blank=True)
    language = models.CharField(max_length=10, default='en')
    cover_url = models.URLField(blank=True)
    toc_json = models.JSONField(null=True, blank=True)
    source = models.CharField(max_length=50, default='manual')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Author
```python
class Author(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, unique=True)
    books = models.ManyToManyField(Book, through='BookAuthor')
```

### Tag
```python
class Tag(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
```

## API Endpoints

### Book Management
- `GET /api/books/` - List all books with pagination
- `POST /api/books/` - Create a new book manually
- `GET /api/books/{id}/` - Get book details
- `PATCH /api/books/{id}/` - Update book metadata
- `DELETE /api/books/{id}/` - Delete book (cascade to library relationships)

### Book Lookup & Ingestion
- `POST /api/books/lookup/` - Lookup book by ISBN (external APIs, no save)
- `POST /api/books/ingest/` - Create book from ISBN with metadata enrichment

### Author Management
- `GET /api/authors/` - List all authors
- `POST /api/authors/` - Create new author
- `GET /api/authors/{id}/` - Get author details with books

### Tag Management
- `GET /api/tags/` - List all tags
- `POST /api/tags/` - Create new tag
- `DELETE /api/tags/{id}/` - Delete tag

## Input/Output Specifications

### Book Creation Input
```json
{
  "primary_isbn_13": "9780123456789",
  "isbn_10": "0123456789",
  "title": "Book Title",
  "subtitle": "Book Subtitle",
  "description": "Book description...",
  "publisher": "Publisher Name",
  "publication_date": "2024-01-01",
  "page_count": 300,
  "language": "en",
  "cover_url": "https://example.com/cover.jpg",
  "authors": ["Author Name 1", "Author Name 2"],
  "tags": ["tag1", "tag2"]
}
```

### Book Lookup Input
```json
{
  "isbn": "9780123456789"
}
```

### Book Lookup Output
```json
{
  "success": true,
  "book": {
    "id": "uuid",
    "primary_isbn_13": "9780123456789",
    "title": "Book Title",
    "authors": ["Author Name"],
    "publisher": "Publisher Name",
    "cover_url": "https://example.com/cover.jpg",
    "description": "Book description...",
    "source": "google_books"
  }
}
```

## External Dependencies

### Metadata Sources
- **Google Books API**: Primary metadata source
- **Open Library API**: Fallback metadata source
- **Rate Limiting**: Respect API rate limits
- **Error Handling**: Graceful fallback on API failures

### Database Dependencies
- **MySQL**: Primary database (SQLite for development)
- **Indexes**: Optimized indexes on ISBN, title, and author fields
- **Constraints**: Unique constraints on ISBN and author names

## Notes for AI Agents

### Development Guidelines
1. **ISBN Normalization**: Always normalize ISBNs to ISBN-13 format when possible
2. **Author Handling**: Create authors separately and link via many-to-many relationships
3. **Metadata Enrichment**: Use external APIs for comprehensive metadata when available
4. **Error Handling**: Provide meaningful error messages for validation failures
5. **Performance**: Use select_related and prefetch_related for efficient queries

### Common Patterns
- **Book Creation**: Use ingest endpoint for external API integration
- **Author Management**: Create authors automatically during book creation
- **Tag Management**: Tags are library-specific and managed through LibraryBook relationships
- **Cover Images**: Store cover URLs, implement local caching for performance

### Validation Rules
- **ISBN-13**: Must be 13 digits, valid check digit
- **ISBN-10**: Must be 10 digits, valid check digit
- **Title**: Required, max 500 characters
- **Authors**: At least one author required
- **Publication Date**: Valid date format, not in future
- **Page Count**: Positive integer if provided

### Error Scenarios
- **Duplicate ISBN**: Return existing book instead of creating duplicate
- **Invalid ISBN**: Return validation error with helpful message
- **API Failure**: Fallback to manual entry with minimal metadata
- **Database Errors**: Log errors and return user-friendly messages

### Testing Considerations
- **Unit Tests**: Test all model methods and validations
- **Integration Tests**: Test API endpoints with external dependencies
- **Performance Tests**: Test with large datasets for query optimization
- **Error Tests**: Test error handling and edge cases

## Current State
- ✅ Core models implemented and migrated
- ✅ API endpoints functional
- ✅ External API integration working
- ✅ Validation and error handling implemented
- ✅ Testing coverage adequate
- ✅ Documentation complete

## Future Enhancements
- **Enhanced Metadata**: Additional metadata sources and fields
- **Bulk Operations**: Batch import and update capabilities
- **Advanced Search**: Full-text search across book metadata
- **Caching**: Redis caching for frequently accessed data
- **Analytics**: Book usage and popularity tracking
