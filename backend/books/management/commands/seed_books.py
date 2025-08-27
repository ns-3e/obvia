from django.core.management.base import BaseCommand
from django.db import transaction
from books.models import Book, Author
from libraries.models import Library
from ingest.clients import BookMetadataClient


class Command(BaseCommand):
    help = 'Seed the database with example books using external APIs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--isbns',
            nargs='+',
            type=str,
            help='List of ISBNs to seed',
            default=[
                '1599869772',  # The Art of War
            ]
        )
        parser.add_argument(
            '--create-library',
            action='store_true',
            help='Create a default library and add books to it',
        )

    def handle(self, *args, **options):
        isbns = options['isbns']
        create_library = options['create_library']
        
        self.stdout.write(f"Starting to seed {len(isbns)} books...")
        
        client = BookMetadataClient()
        created_books = []
        
        for isbn in isbns:
            self.stdout.write(f"Processing ISBN: {isbn}")
            
            try:
                # Check if book already exists
                existing_book = Book.objects.filter(
                    primary_isbn_13=isbn
                ).first() or Book.objects.filter(
                    isbn_10=isbn
                ).first()
                
                if existing_book:
                    self.stdout.write(f"Book already exists: {existing_book.title}")
                    created_books.append(existing_book)
                    continue
                
                # Lookup book metadata
                metadata = client.lookup_by_isbn(isbn)
                
                if not metadata:
                    self.stdout.write(
                        self.style.WARNING(f"No metadata found for ISBN: {isbn}")
                    )
                    continue
                
                with transaction.atomic():
                    # Create or get authors
                    authors = []
                    for author_name in metadata.get('authors', []):
                        if author_name.strip():
                            author, created = Author.objects.get_or_create(
                                name=author_name.strip()
                            )
                            authors.append(author)
                            if created:
                                self.stdout.write(f"Created author: {author.name}")
                    
                    # Create book
                    book_data = {
                        'primary_isbn_13': metadata.get('primary_isbn_13'),
                        'isbn_10': metadata.get('isbn_10'),
                        'title': metadata.get('title', ''),
                        'subtitle': metadata.get('subtitle'),
                        'description': metadata.get('description'),
                        'publisher': metadata.get('publisher'),
                        'publication_date': metadata.get('publication_date'),
                        'page_count': metadata.get('page_count'),
                        'language': metadata.get('language', 'en'),
                        'cover_url': metadata.get('cover_url'),
                        'source': metadata.get('source', 'manual')
                    }
                    
                    # Remove None values
                    book_data = {k: v for k, v in book_data.items() if v is not None}
                    
                    book = Book.objects.create(**book_data)
                    book.authors.set(authors)
                    
                    created_books.append(book)
                    self.stdout.write(
                        self.style.SUCCESS(f"Created book: {book.title}")
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing ISBN {isbn}: {str(e)}")
                )
        
        # Create default library if requested
        if create_library and created_books:
            try:
                library, created = Library.objects.get_or_create(
                    name="My Library",
                    defaults={'description': 'Default library'}
                )
                
                if created:
                    self.stdout.write(f"Created library: {library.name}")
                
                # Add books to library
                from libraries.models import LibraryBook
                for book in created_books:
                    library_book, created = LibraryBook.objects.get_or_create(
                        library=library,
                        book=book
                    )
                    if created:
                        self.stdout.write(f"Added {book.title} to {library.name}")
                        
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error creating library: {str(e)}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully processed {len(created_books)} books"
            )
        )
