import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from libraries.models import Library, LibraryBook
from libraries.serializers import LibraryImportSerializer, BookImportSerializer
from books.models import Book, Tag, Shelf, Author
from books.serializers import BookCreateSerializer


class Command(BaseCommand):
    help = 'Import a library from a JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            'file_path',
            type=str,
            help='Path to the JSON file containing library data'
        )
        parser.add_argument(
            '--library-name',
            type=str,
            help='Override the library name from the import file'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate the import file without actually importing'
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        library_name_override = options['library_name']
        dry_run = options['dry_run']

        try:
            # Check if file exists
            if not os.path.exists(file_path):
                raise CommandError(f'File "{file_path}" not found')

            # Read and parse JSON file
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    import_data = json.load(f)
            except json.JSONDecodeError as e:
                raise CommandError(f'Invalid JSON file: {str(e)}')
            except UnicodeDecodeError as e:
                raise CommandError(f'File encoding error: {str(e)}')

            # Override library name if specified
            if library_name_override:
                import_data['name'] = library_name_override

            # Validate the import data
            library_serializer = LibraryImportSerializer(data=import_data)
            if not library_serializer.is_valid():
                raise CommandError(f'Invalid library data: {library_serializer.errors}')

            if dry_run:
                self.stdout.write(
                    self.style.SUCCESS('Dry run completed successfully')
                )
                self.stdout.write(f'Library name: {import_data["name"]}')
                self.stdout.write(f'Books to import: {len(import_data.get("library_books", []))}')
                return

            # Perform the import
            with transaction.atomic():
                library_data = library_serializer.validated_data
                
                # Create the library
                library = Library.objects.create(
                    name=library_data['name'],
                    description=library_data.get('description', ''),
                    is_system=False
                )

                # Import books
                imported_books = 0
                skipped_books = 0
                errors = []

                for book_data in library_data.get('library_books', []):
                    try:
                        # Validate book data
                        book_serializer = BookImportSerializer(data=book_data)
                        if not book_serializer.is_valid():
                            errors.append(f"Book '{book_data.get('title', 'Unknown')}': {book_serializer.errors}")
                            continue

                        validated_book_data = book_serializer.validated_data

                        # Check if book already exists
                        existing_book = None
                        if validated_book_data.get('primary_isbn_13'):
                            existing_book = Book.objects.filter(
                                primary_isbn_13=validated_book_data['primary_isbn_13']
                            ).first()
                        elif validated_book_data.get('isbn_10'):
                            existing_book = Book.objects.filter(
                                isbn_10=validated_book_data['isbn_10']
                            ).first()

                        if not existing_book:
                            # Create new book
                            book_create_data = {k: v for k, v in validated_book_data.items() 
                                              if k not in ['tags', 'shelves', 'custom_title', 'custom_notes_summary']}
                            book_serializer = BookCreateSerializer(data=book_create_data)
                            if book_serializer.is_valid():
                                book = book_serializer.save()
                            else:
                                errors.append(f"Book '{validated_book_data.get('title', 'Unknown')}': {book_serializer.errors}")
                                continue
                        else:
                            book = existing_book
                            skipped_books += 1

                        # Create library book entry
                        library_book = LibraryBook.objects.create(
                            library=library,
                            book=book,
                            custom_title=validated_book_data.get('custom_title'),
                            custom_notes_summary=validated_book_data.get('custom_notes_summary')
                        )

                        # Add tags
                        for tag_name in validated_book_data.get('tags', []):
                            tag, created = Tag.objects.get_or_create(name=tag_name.strip())
                            library_book.tags.add(tag)

                        # Add shelves
                        for shelf_name in validated_book_data.get('shelves', []):
                            shelf, created = Shelf.objects.get_or_create(name=shelf_name.strip())
                            library_book.shelves.add(shelf)

                        imported_books += 1

                    except Exception as e:
                        errors.append(f"Book '{book_data.get('title', 'Unknown')}': {str(e)}")
                        continue

                # Report results
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully imported library "{library.name}"'
                    )
                )
                self.stdout.write(f'Imported books: {imported_books}')
                self.stdout.write(f'Skipped books: {skipped_books}')
                
                if errors:
                    self.stdout.write(
                        self.style.WARNING(f'Errors encountered: {len(errors)}')
                    )
                    for error in errors:
                        self.stdout.write(f'  - {error}')

        except Exception as e:
            raise CommandError(f'Import failed: {str(e)}')
