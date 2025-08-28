# Mass Book Operations Feature

This document describes the mass book operations functionality that allows users to perform bulk operations on books across libraries.

## Overview

The mass operations feature provides:
- **Bulk Add**: Add multiple books to a library at once
- **Bulk Remove**: Remove multiple books from a library
- **Bulk Move**: Move multiple books between libraries
- **Smart Handling**: Automatic duplicate detection and error handling
- **Data Integrity**: Transaction safety and proper book lifecycle management

## Features

### Mass Add Operations
- Add multiple books to a target library
- Automatic duplicate detection (skips books already in the library)
- Detailed operation reports with success/error counts
- Support for books from any source

### Mass Remove Operations
- Remove multiple books from a source library
- Option to move books to "Unassigned" library if they're not in other libraries
- Smart book lifecycle management
- Prevents orphaned books

### Mass Move Operations
- Move multiple books between libraries
- Automatic duplicate handling in target library
- Preserves book metadata and relationships
- Efficient bulk operations

## API Endpoints

### Individual Library Operations

#### Mass Add Books to Library
```
POST /api/libraries/{library_id}/mass_add_books/
```

**Request Body:**
```json
{
  "book_ids": ["book-uuid-1", "book-uuid-2", "book-uuid-3"]
}
```

**Response:**
```json
{
  "message": "Mass add operation completed for library \"Library Name\"",
  "added_books": 2,
  "skipped_books": 1,
  "errors": null
}
```

#### Mass Remove Books from Library
```
POST /api/libraries/{library_id}/mass_remove_books/
```

**Request Body:**
```json
{
  "book_ids": ["book-uuid-1", "book-uuid-2"],
  "move_to_unassigned": true
}
```

**Response:**
```json
{
  "message": "Mass remove operation completed for library \"Library Name\"",
  "removed_books": 0,
  "moved_books": 2,
  "errors": null
}
```

#### Mass Move Books from Library
```
POST /api/libraries/{library_id}/mass_move_books/
```

**Request Body:**
```json
{
  "target_library_id": "target-library-id",
  "book_ids": ["book-uuid-1", "book-uuid-2"]
}
```

**Response:**
```json
{
  "message": "Mass move operation completed from \"Source Library\" to \"Target Library\"",
  "moved_books": 2,
  "skipped_books": 0,
  "errors": null
}
```

### Global Operations

#### Global Mass Operations
```
POST /api/libraries/mass_operations/
```

**Request Body:**
```json
{
  "operation_type": "add_to_library|remove_from_library|move_between_libraries",
  "source_library_id": "source-library-id",  // Required for remove/move
  "target_library_id": "target-library-id",  // Required for add/move
  "book_ids": ["book-uuid-1", "book-uuid-2"],
  "move_to_unassigned": true  // Optional for remove operations
}
```

## Frontend Usage

### Accessing Mass Operations
1. Navigate to Libraries page
2. Click "Mass Operations" tab
3. Configure the operation type and parameters
4. Select books to operate on
5. Execute the operation

### Operation Types

#### Add Books to Library
1. Select "Add Books to Library" operation type
2. Choose target library from dropdown
3. Select books to add (all books are available)
4. Click "Add X Books to Library"

#### Remove Books from Library
1. Select "Remove Books from Library" operation type
2. Choose source library from dropdown
3. Optionally enable "Move to Unassigned" checkbox
4. Select books to remove (only books in source library)
5. Click "Remove X Books from Library"

#### Move Books Between Libraries
1. Select "Move Books Between Libraries" operation type
2. Choose source and target libraries
3. Select books to move (only books in source library)
4. Click "Move X Books to Library"

### Book Selection Features
- **Select All**: Select all available books
- **Deselect All**: Clear all selections
- **Select from Source**: Select only books in the source library (for remove/move operations)
- **Individual Selection**: Click checkboxes to select specific books
- **Visual Feedback**: Selected books are highlighted

## Error Handling

### Common Error Scenarios
- **Book Not Found**: Book ID doesn't exist in database
- **Book Not in Source Library**: Trying to remove/move a book that's not in the source library
- **Library Not Found**: Target or source library doesn't exist
- **Same Library**: Trying to move books to the same library
- **Invalid Data**: Missing required fields or invalid data types

### Error Response Format
```json
{
  "message": "Operation completed with errors",
  "added_books": 1,
  "skipped_books": 0,
  "errors": [
    "Book with ID book-uuid-1 not found",
    "Book with ID book-uuid-2 is not in the source library"
  ]
}
```

## Data Integrity

### Transaction Safety
- All operations use database transactions
- Partial failures are handled gracefully
- Successful operations are committed, failed operations are rolled back

### Book Lifecycle Management
- Books removed from libraries are moved to "Unassigned" if not in other libraries
- Duplicate books in target libraries are handled appropriately
- Book metadata and relationships are preserved

### System Library Protection
- System libraries (like "Unassigned") are protected from certain operations
- Books can be added to system libraries but with appropriate restrictions

## Performance Considerations

### Large Operations
- Operations are processed in batches for better performance
- Progress indicators show operation status
- Error reporting includes detailed information for troubleshooting

### Memory Usage
- Book lists are paginated for large collections
- Efficient database queries minimize memory usage
- Client-side filtering reduces server load

## Best Practices

### Before Operations
1. **Backup**: Export libraries before major operations
2. **Test**: Use small batches for testing new operations
3. **Verify**: Check book selections before executing
4. **Plan**: Understand the impact of the operation

### During Operations
1. **Monitor**: Watch progress indicators
2. **Review**: Check operation results and error reports
3. **Verify**: Confirm books are in expected locations

### After Operations
1. **Validate**: Check that books are in correct libraries
2. **Clean Up**: Remove any unwanted books from "Unassigned"
3. **Document**: Keep records of major operations

## API Examples

### Add Books to Library
```bash
curl -X POST "http://localhost:8000/api/libraries/1/mass_add_books/" \
  -H "Content-Type: application/json" \
  -d '{
    "book_ids": ["book-uuid-1", "book-uuid-2", "book-uuid-3"]
  }'
```

### Remove Books from Library
```bash
curl -X POST "http://localhost:8000/api/libraries/1/mass_remove_books/" \
  -H "Content-Type: application/json" \
  -d '{
    "book_ids": ["book-uuid-1", "book-uuid-2"],
    "move_to_unassigned": true
  }'
```

### Move Books Between Libraries
```bash
curl -X POST "http://localhost:8000/api/libraries/1/mass_move_books/" \
  -H "Content-Type: application/json" \
  -d '{
    "target_library_id": 2,
    "book_ids": ["book-uuid-1", "book-uuid-2"]
  }'
```

### Global Mass Operation
```bash
curl -X POST "http://localhost:8000/api/libraries/mass_operations/" \
  -H "Content-Type: application/json" \
  -d '{
    "operation_type": "move_between_libraries",
    "source_library_id": 1,
    "target_library_id": 2,
    "book_ids": ["book-uuid-1", "book-uuid-2"]
  }'
```

## Testing

The feature includes comprehensive testing:
- Unit tests for all operation types
- Error handling tests
- Edge case testing
- Performance testing for large operations

### Running Tests
```bash
# Run all mass operations tests
python manage.py test libraries.test_mass_operations

# Run specific test
python manage.py test libraries.test_mass_operations.MassBookOperationsTestCase.test_mass_add_books
```

## Future Enhancements

Potential future improvements:
- **Batch Processing**: Support for very large operations with progress tracking
- **Scheduled Operations**: Queue operations for later execution
- **Operation History**: Track and audit mass operations
- **Advanced Filtering**: Filter books by tags, authors, or other criteria
- **Undo Operations**: Ability to reverse mass operations
- **Template Operations**: Save and reuse common operation patterns

## Troubleshooting

### Common Issues

**Operation Fails with Errors**
- Check that all book IDs are valid
- Verify source library contains the books
- Ensure target library exists and is accessible

**Books Not Moving as Expected**
- Check "move_to_unassigned" setting
- Verify books aren't in other libraries
- Review operation results for skipped books

**Performance Issues**
- Break large operations into smaller batches
- Check database performance and indexes
- Monitor server resources during operations

### Debug Commands
```bash
# Check library contents
python manage.py shell -c "from libraries.models import Library; lib = Library.objects.get(id=1); print(f'Books in {lib.name}: {lib.library_books.count()}')"

# Verify book locations
python manage.py shell -c "from books.models import Book; book = Book.objects.get(id='book-uuid'); print(f'Book {book.title} in libraries: {[lb.library.name for lb in book.library_books.all()]}')"
```

## Security Considerations

- **Input Validation**: All book IDs and library IDs are validated
- **Access Control**: Operations respect library permissions
- **Data Protection**: Sensitive book data is handled securely
- **Audit Trail**: Operations can be tracked for security purposes

## Conclusion

The mass book operations feature provides a powerful and user-friendly way to manage large collections of books across multiple libraries. With comprehensive error handling, data integrity protection, and detailed reporting, users can confidently perform bulk operations while maintaining the integrity of their book collections.
