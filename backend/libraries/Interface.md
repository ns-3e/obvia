# Libraries Module Interface

## Purpose
The libraries module manages user-created book collections and provides the organizational structure for grouping and managing books within the Preposition system. It handles library creation, book-to-library relationships, and shelf organization.

## Responsibilities
- **Library Management**: Create, update, and delete user libraries
- **Book Organization**: Add and remove books from libraries
- **Shelf Management**: System and custom shelf organization
- **Library-Specific Metadata**: Custom notes and metadata for books within libraries
- **Book Counting**: Track book counts and library statistics
- **Access Control**: Single-user library access (no multi-user complexity)

## Key Models

### Library
```python
class Library(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### LibraryBook
```python
class LibraryBook(models.Model):
    id = models.AutoField(primary_key=True)
    library = models.ForeignKey(Library, on_delete=models.CASCADE, related_name='library_books')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='library_books')
    added_at = models.DateTimeField(auto_now_add=True)
    custom_title = models.CharField(max_length=500, blank=True)
    custom_notes_summary = models.TextField(blank=True)
```

### Shelf
```python
class Shelf(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### ShelfItem
```python
class ShelfItem(models.Model):
    id = models.AutoField(primary_key=True)
    shelf = models.ForeignKey(Shelf, on_delete=models.CASCADE, related_name='items')
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE, related_name='shelf_items')
    added_at = models.DateTimeField(auto_now_add=True)
```

## API Endpoints

### Library Management
- `GET /api/libraries/` - List all libraries with book counts
- `POST /api/libraries/` - Create a new library
- `GET /api/libraries/{id}/` - Get library details
- `PATCH /api/libraries/{id}/` - Update library
- `DELETE /api/libraries/{id}/` - Delete library (cascade to books)

### Library Book Management
- `GET /api/libraries/{id}/books/` - List books in library with filters
- `POST /api/libraries/{id}/books/` - Add book to library
- `DELETE /api/libraries/{id}/books/{library_book_id}/` - Remove book from library
- `PATCH /api/libraries/{id}/books/{library_book_id}/` - Update library book metadata

### Shelf Management
- `GET /api/shelves/` - List all shelves
- `GET /api/shelves/system/` - Get system shelves (wishlist, reading, finished)
- `GET /api/shelves/custom/` - Get custom shelves
- `POST /api/shelves/` - Create new shelf
- `PATCH /api/shelves/{id}/` - Update shelf
- `DELETE /api/shelves/{id}/` - Delete shelf
- `POST /api/shelves/{id}/add_book/` - Add book to shelf
- `DELETE /api/shelves/{id}/remove_book/` - Remove book from shelf
- `GET /api/shelves/{id}/books/` - Get books on shelf

## Input/Output Specifications

### Library Creation Input
```json
{
  "name": "My Personal Library",
  "description": "A collection of my favorite books"
}
```

### Library Output
```json
{
  "id": 1,
  "name": "My Personal Library",
  "description": "A collection of my favorite books",
  "is_system": false,
  "library_books_count": 25,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Add Book to Library Input
```json
{
  "book_id": "uuid-of-book",
  "custom_title": "Optional custom title",
  "custom_notes_summary": "Optional custom notes"
}
```

### Library Books List Output
```json
{
  "count": 25,
  "next": "http://api/libraries/1/books/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "book": {
        "id": "uuid",
        "title": "Book Title",
        "authors": ["Author Name"],
        "cover_url": "https://example.com/cover.jpg"
      },
      "custom_title": "Custom Title",
      "custom_notes_summary": "Custom notes",
      "added_at": "2024-01-01T00:00:00Z",
      "shelves": ["reading", "favorites"]
    }
  ]
}
```

### Shelf Creation Input
```json
{
  "name": "Science Fiction",
  "is_system": false
}
```

## System Shelves

### Default System Shelves
- **wishlist**: Books to read in the future
- **reading**: Currently reading
- **finished**: Completed books

### System Shelf Behavior
- System shelves are created automatically
- Cannot be deleted or renamed
- Available across all libraries
- Used for reading progress tracking

## External Dependencies

### Database Dependencies
- **MySQL**: Primary database with proper indexing
- **Foreign Keys**: Enforced relationships between models
- **Indexes**: Optimized for library book queries and filtering

### Related Modules
- **Books Module**: Book entity relationships
- **Notes Module**: Library-specific notes
- **Search Module**: Library-scoped search functionality

## Notes for AI Agents

### Development Guidelines
1. **Library Isolation**: Each library is independent, no cross-library operations
2. **Book Relationships**: Books can exist in multiple libraries with different metadata
3. **Shelf Organization**: Shelves provide additional organization within libraries
4. **System Shelves**: Always maintain system shelf integrity
5. **Performance**: Use efficient queries for library book counts and filtering

### Common Patterns
- **Library Creation**: Always create with user-friendly defaults
- **Book Addition**: Check for existing book in library before adding
- **Shelf Management**: Create system shelves automatically on first run
- **Book Removal**: Cascade delete related notes and ratings
- **Library Deletion**: Confirm with user due to data loss

### Validation Rules
- **Library Name**: Required, max 200 characters, unique per user
- **Library Description**: Optional, max 1000 characters
- **Shelf Name**: Required, max 100 characters, unique per library
- **Book Addition**: Book must exist, not already in library
- **System Shelves**: Cannot be modified or deleted

### Error Scenarios
- **Duplicate Book**: Return error if book already in library
- **Invalid Library**: Return 404 for non-existent library
- **System Shelf Violation**: Prevent modification of system shelves
- **Cascade Deletion**: Warn user about data loss on library deletion

### Performance Considerations
- **Book Counts**: Use annotated queries for efficient counting
- **Filtering**: Implement efficient filtering by tags, ratings, shelves
- **Pagination**: Always paginate large library book lists
- **Caching**: Cache library metadata for frequently accessed data

### Testing Considerations
- **Unit Tests**: Test all model methods and validations
- **Integration Tests**: Test library book relationships
- **Performance Tests**: Test with large libraries (1000+ books)
- **Edge Cases**: Test system shelf behavior and cascade operations

## Current State
- ✅ Core models implemented and migrated
- ✅ API endpoints functional
- ✅ System shelves working
- ✅ Book counting implemented
- ✅ Filtering and pagination working
- ✅ Testing coverage adequate
- ✅ Documentation complete

## Future Enhancements
- **Library Templates**: Pre-configured library templates
- **Library Sharing**: Optional library sharing capabilities
- **Advanced Organization**: Hierarchical library structure
- **Library Analytics**: Reading statistics per library
- **Bulk Operations**: Batch book management operations
- **Library Import/Export**: Backup and restore functionality
