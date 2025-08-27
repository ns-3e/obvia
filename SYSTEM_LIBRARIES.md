# System Libraries Feature

This document explains the system libraries feature that ensures the "Unassigned" library is always available and protected from deletion.

## Overview

The system libraries feature provides:
- **Automatic "Unassigned" Library**: Always created by default
- **Deletion Protection**: System libraries cannot be deleted by users
- **Visual Indicators**: System libraries are clearly marked in the UI
- **Data Integrity**: Ensures books always have a place to go when removed from other libraries

## Implementation Details

### Backend Changes

#### 1. Library Model Enhancement
- Added `is_system` field to mark system libraries
- Updated `get_unassigned_library()` method to mark "Unassigned" as system library

```python
class Library(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_system = models.BooleanField(default=False, help_text="System libraries cannot be deleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 2. Deletion Protection
- Enhanced `LibraryViewSet.destroy()` method to check `is_system` field
- Returns 400 error for system library deletion attempts

```python
def destroy(self, request, *args, **kwargs):
    library = self.get_object()
    
    # Prevent deletion of system libraries
    if library.is_system:
        return Response(
            {'error': f'The "{library.name}" library is a system library and cannot be deleted'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
```

#### 3. Management Command
- Created `create_default_libraries` command to ensure "Unassigned" library exists
- Automatically marks "Unassigned" as system library
- Safe to run multiple times (won't create duplicates)

```bash
python manage.py create_default_libraries
```

### Frontend Changes

#### 1. Visual Indicators
- System libraries show a "System" badge in the library manager
- Delete buttons are hidden for system libraries

```jsx
{library.is_system && (
  <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
    System
  </span>
)}
```

#### 2. Deletion Protection
- Frontend checks `is_system` field before showing delete buttons
- Provides clear visual feedback about protected libraries

## Usage

### Automatic Setup

The "Unassigned" library is automatically created when:
1. Running `./scripts/docker-manage.sh start`
2. Running `python manage.py create_default_libraries`
3. First time the application starts

### Manual Setup

To manually create the default libraries:

```bash
# Using the management script
./scripts/docker-manage.sh setup-defaults

# Using Django directly
docker compose exec backend python manage.py create_default_libraries
```

### Verification

Check that the "Unassigned" library exists and is protected:

```bash
# Check libraries in Django shell
docker compose exec backend python manage.py shell -c "from libraries.models import Library; [print(f'- {lib.name} (System: {lib.is_system})') for lib in Library.objects.all()]"
```

## Testing

### Backend Tests

The following tests verify the system library functionality:

- `test_delete_system_library`: Verifies system libraries cannot be deleted
- `test_create_default_libraries_command`: Tests the management command

### Manual Testing

1. **Create System Library**: Should show "System" badge
2. **Delete System Library**: Should show error message
3. **Remove Book from Library**: Should move to "Unassigned" if not in other libraries

## Migration

The feature includes a database migration that adds the `is_system` field:

```bash
# Apply migrations
docker compose exec backend python manage.py migrate

# Create default libraries
docker compose exec backend python manage.py create_default_libraries
```

## Benefits

1. **Data Integrity**: Books always have a destination when removed from libraries
2. **User Experience**: Clear visual indicators prevent confusion
3. **System Stability**: Critical libraries cannot be accidentally deleted
4. **Automatic Setup**: No manual intervention required for basic functionality

## Future Enhancements

Potential future system libraries:
- "Recently Added" - for newly imported books
- "Favorites" - for user's favorite books
- "Reading Now" - for currently reading books

## Troubleshooting

### "Unassigned" Library Missing

If the "Unassigned" library is missing:

```bash
# Create it manually
docker compose exec backend python manage.py create_default_libraries

# Check if it exists
docker compose exec backend python manage.py shell -c "from libraries.models import Library; print(Library.objects.filter(name='Unassigned').exists())"
```

### System Library Not Protected

If a system library can be deleted:

1. Check the `is_system` field value
2. Ensure the migration was applied
3. Verify the frontend is checking the `is_system` field

### Migration Issues

If migrations fail:

```bash
# Check migration status
docker compose exec backend python manage.py showmigrations libraries

# Apply specific migration
docker compose exec backend python manage.py migrate libraries 0002
```
