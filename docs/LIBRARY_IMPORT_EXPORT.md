# Library Import/Export Feature

This document describes the library import/export functionality that allows users to backup, share, and migrate their library collections.

## Overview

The import/export feature provides:
- **Complete Library Export**: Export libraries with all books, metadata, tags, and shelves
- **Library Import**: Import libraries from JSON files with duplicate detection
- **System Library Protection**: System libraries cannot be exported
- **Error Handling**: Robust error handling with detailed feedback
- **Command Line Tools**: Management commands for bulk operations

## Features

### Export Functionality
- Export complete library data as JSON files
- Include all book metadata, authors, tags, and shelves
- Automatic filename generation with timestamps
- System library protection (cannot export system libraries)
- Download files directly from the browser

### Import Functionality
- Import libraries from JSON files
- Support for drag-and-drop file upload
- Duplicate book detection by ISBN
- Automatic tag and shelf creation
- Detailed import reports with success/error counts
- Partial import support (continues even if some books fail)

## API Endpoints

### Export Library
```
GET /api/libraries/{id}/export/
```

**Response**: JSON file download with library data

**Example**:
```bash
curl -X GET "http://localhost:8000/api/libraries/1/export/" \
  -H "Accept: application/json" \
  --output "my_library.json"
```

### Import Library
```
POST /api/libraries/import_library/
```

**Request**: Multipart form data with JSON file or direct JSON data

**Example with file upload**:
```bash
curl -X POST "http://localhost:8000/api/libraries/import_library/" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my_library.json"
```

**Example with direct JSON**:
```bash
curl -X POST "http://localhost:8000/api/libraries/import_library/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Imported Library",
    "description": "A library imported from JSON",
    "library_books": [
      {
        "book": {
          "title": "Sample Book",
          "primary_isbn_13": "9781234567890",
          "language": "en",
          "source": "import",
          "author_names": ["Sample Author"]
        },
        "custom_title": "Custom Title",
        "tags": ["fiction", "sci-fi"],
        "shelves": ["reading"]
      }
    ]
  }'
```

## Data Format

### Export Format
The exported JSON contains the complete library structure:

```json
{
  "id": 1,
  "name": "My Library",
  "description": "A collection of books",
  "is_system": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "library_books": [
    {
      "added_at": "2024-01-01T00:00:00Z",
      "custom_title": "Custom Book Title",
      "custom_notes_summary": "Custom notes",
      "book": {
        "id": "uuid",
        "title": "Book Title",
        "subtitle": "Book Subtitle",
        "description": "Book description",
        "publisher": "Publisher Name",
        "publication_date": "2020-01-01",
        "page_count": 300,
        "language": "en",
        "cover_url": "https://example.com/cover.jpg",
        "primary_isbn_13": "9781234567890",
        "isbn_10": "1234567890",
        "source": "manual",
        "authors": [
          {
            "id": 1,
            "name": "Author Name",
            "created_at": "2024-01-01T00:00:00Z"
          }
        ],
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      "tags": [
        {
          "id": 1,
          "name": "Tag Name",
          "created_at": "2024-01-01T00:00:00Z"
        }
      ],
      "shelves": [
        {
          "id": 1,
          "name": "Shelf Name",
          "is_system": false,
          "created_at": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### Import Format
The import format is similar but simplified:

```json
{
  "name": "Library Name",
  "description": "Library description",
  "library_books": [
    {
      "book": {
        "title": "Book Title",
        "subtitle": "Book Subtitle",
        "description": "Book description",
        "publisher": "Publisher Name",
        "publication_date": "2020-01-01",
        "page_count": 300,
        "language": "en",
        "cover_url": "https://example.com/cover.jpg",
        "primary_isbn_13": "9781234567890",
        "isbn_10": "1234567890",
        "source": "import",
        "author_names": ["Author 1", "Author 2"]
      },
      "custom_title": "Custom Title",
      "custom_notes_summary": "Custom notes",
      "tags": ["tag1", "tag2"],
      "shelves": ["shelf1", "shelf2"]
    }
  ]
}
```

## Management Commands

### Export Library Command
Export a library from the command line:

```bash
# Export with default filename
python manage.py export_library "My Library"

# Export with custom filename
python manage.py export_library "My Library" --output "backup.json"

# Export with pretty formatting
python manage.py export_library "My Library" --pretty
```

### Import Library Command
Import a library from the command line:

```bash
# Import from file
python manage.py import_library "path/to/library.json"

# Import with custom library name
python manage.py import_library "path/to/library.json" --library-name "New Name"

# Validate without importing (dry run)
python manage.py import_library "path/to/library.json" --dry-run
```

## Frontend Usage

### Export Libraries
1. Navigate to Libraries page
2. Click "Import & Export" tab
3. Find the library you want to export
4. Click "Export" button
5. File will download automatically

### Import Libraries
1. Navigate to Libraries page
2. Click "Import & Export" tab
3. Drag and drop a JSON file or click "browse"
4. Review the file details
5. Click "Import Library"
6. Review the import results

## Error Handling

### Export Errors
- **System Library**: Cannot export system libraries (e.g., "Unassigned")
- **Library Not Found**: Library doesn't exist
- **Permission Issues**: File system permissions

### Import Errors
- **Invalid JSON**: Malformed JSON file
- **Wrong File Type**: Non-JSON files
- **Duplicate Library Name**: Library name already exists
- **Invalid Book Data**: Missing required fields
- **Partial Failures**: Some books fail to import

### Error Response Format
```json
{
  "error": "Error message",
  "details": {
    "field": ["specific error"]
  }
}
```

## Best Practices

### Export
1. **Regular Backups**: Export libraries regularly for backup
2. **Meaningful Names**: Use descriptive library names
3. **File Organization**: Store exports in organized folders
4. **Version Control**: Keep multiple versions for important libraries

### Import
1. **Validate Files**: Use dry-run to validate before importing
2. **Check Duplicates**: Review existing books to avoid duplicates
3. **Test Imports**: Test imports on small libraries first
4. **Backup First**: Always backup before large imports

### Data Integrity
1. **ISBN Matching**: Books are matched by ISBN to prevent duplicates
2. **Tag Creation**: Tags are created automatically if they don't exist
3. **Shelf Creation**: Shelves are created automatically if they don't exist
4. **Author Handling**: Authors are created or linked as needed

## Limitations

### Export Limitations
- System libraries cannot be exported
- File size may be large for libraries with many books
- Export includes all metadata but not file attachments

### Import Limitations
- Library names must be unique
- Book titles are required
- ISBN matching is case-sensitive
- Large imports may take time

## Troubleshooting

### Common Issues

**Export Fails**
- Check if library is a system library
- Verify library exists
- Check file permissions

**Import Fails**
- Validate JSON format
- Check for duplicate library names
- Review error messages for specific issues

**Partial Import**
- Check individual book data
- Verify required fields are present
- Review import report for details

### Debug Commands
```bash
# Check library status
python manage.py shell -c "from libraries.models import Library; print(Library.objects.all())"

# Validate export data
python manage.py export_library "Library Name" --output "test.json" --pretty

# Test import validation
python manage.py import_library "test.json" --dry-run
```

## Security Considerations

1. **File Validation**: Only JSON files are accepted
2. **Size Limits**: Large files may be rejected
3. **Content Validation**: All data is validated before import
4. **System Protection**: System libraries cannot be modified
5. **Transaction Safety**: Imports use database transactions

## Future Enhancements

Potential future improvements:
- **Compression**: Support for compressed files
- **Batch Operations**: Import/export multiple libraries
- **Incremental Updates**: Update existing libraries
- **Cloud Storage**: Direct cloud storage integration
- **Format Support**: Additional export formats (CSV, XML)
- **Scheduling**: Automated backup scheduling
