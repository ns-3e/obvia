from django.core.management.base import BaseCommand
from django.conf import settings
from search.services import semantic_search_service
from books.models import Book
from notes.models import Note, Review
from files.models import BookFile
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Create embeddings for existing content to enable semantic search'

    def add_arguments(self, parser):
        parser.add_argument(
            '--content-type',
            choices=['books', 'notes', 'reviews', 'files', 'all'],
            default='all',
            help='Type of content to create embeddings for'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Recreate embeddings even if they already exist'
        )

    def handle(self, *args, **options):
        if not semantic_search_service.is_enabled():
            self.stdout.write(
                self.style.ERROR(
                    'Semantic search is not enabled. Set AI_PROVIDER environment variable.'
                )
            )
            return

        content_type = options['content_type']
        force = options['force']

        self.stdout.write(
            self.style.SUCCESS(
                f'Creating embeddings using {semantic_search_service.ai_provider} provider'
            )
        )

        total_created = 0
        total_skipped = 0
        total_failed = 0

        if content_type in ['books', 'all']:
            created, skipped, failed = self._create_book_embeddings(force)
            total_created += created
            total_skipped += skipped
            total_failed += failed

        if content_type in ['notes', 'all']:
            created, skipped, failed = self._create_note_embeddings(force)
            total_created += created
            total_skipped += skipped
            total_failed += failed

        if content_type in ['reviews', 'all']:
            created, skipped, failed = self._create_review_embeddings(force)
            total_created += created
            total_skipped += skipped
            total_failed += failed

        if content_type in ['files', 'all']:
            created, skipped, failed = self._create_file_embeddings(force)
            total_created += created
            total_skipped += skipped
            total_failed += failed

        self.stdout.write(
            self.style.SUCCESS(
                f'Embedding creation complete: {total_created} created, {total_skipped} skipped, {total_failed} failed'
            )
        )

    def _create_book_embeddings(self, force=False):
        """Create embeddings for book descriptions."""
        created = 0
        skipped = 0
        failed = 0

        books = Book.objects.filter(description__isnull=False).exclude(description='')
        total_books = books.count()

        self.stdout.write(f'Processing {total_books} books...')

        for book in books:
            try:
                if semantic_search_service._get_or_create_embedding('book', book.id, book.description):
                    created += 1
                    self.stdout.write(f'  ✓ Created embedding for book: {book.title}')
                else:
                    if force:
                        # Force recreation by deleting existing embedding
                        from search.models import SearchEmbedding
                        SearchEmbedding.objects.filter(
                            owner_type='book',
                            owner_id=book.id,
                            model=semantic_search_service.ai_provider
                        ).delete()
                        
                        if semantic_search_service._get_or_create_embedding('book', book.id, book.description):
                            created += 1
                            self.stdout.write(f'  ✓ Recreated embedding for book: {book.title}')
                        else:
                            failed += 1
                            self.stdout.write(f'  ✗ Failed to create embedding for book: {book.title}')
                    else:
                        skipped += 1
                        self.stdout.write(f'  - Skipped book (embedding exists): {book.title}')
            except Exception as e:
                failed += 1
                self.stdout.write(f'  ✗ Error creating embedding for book {book.title}: {e}')

        return created, skipped, failed

    def _create_note_embeddings(self, force=False):
        """Create embeddings for note content."""
        created = 0
        skipped = 0
        failed = 0

        notes = Note.objects.filter(content_markdown__isnull=False).exclude(content_markdown='')
        total_notes = notes.count()

        self.stdout.write(f'Processing {total_notes} notes...')

        for note in notes:
            try:
                if semantic_search_service._get_or_create_embedding('note', note.id, note.content_markdown):
                    created += 1
                    self.stdout.write(f'  ✓ Created embedding for note: {note.title}')
                else:
                    if force:
                        from search.models import SearchEmbedding
                        SearchEmbedding.objects.filter(
                            owner_type='note',
                            owner_id=note.id,
                            model=semantic_search_service.ai_provider
                        ).delete()
                        
                        if semantic_search_service._get_or_create_embedding('note', note.id, note.content_markdown):
                            created += 1
                            self.stdout.write(f'  ✓ Recreated embedding for note: {note.title}')
                        else:
                            failed += 1
                            self.stdout.write(f'  ✗ Failed to create embedding for note: {note.title}')
                    else:
                        skipped += 1
                        self.stdout.write(f'  - Skipped note (embedding exists): {note.title}')
            except Exception as e:
                failed += 1
                self.stdout.write(f'  ✗ Error creating embedding for note {note.title}: {e}')

        return created, skipped, failed

    def _create_review_embeddings(self, force=False):
        """Create embeddings for review content."""
        created = 0
        skipped = 0
        failed = 0

        reviews = Review.objects.filter(body_markdown__isnull=False).exclude(body_markdown='')
        total_reviews = reviews.count()

        self.stdout.write(f'Processing {total_reviews} reviews...')

        for review in reviews:
            try:
                if semantic_search_service._get_or_create_embedding('review', review.id, review.body_markdown):
                    created += 1
                    self.stdout.write(f'  ✓ Created embedding for review: {review.title}')
                else:
                    if force:
                        from search.models import SearchEmbedding
                        SearchEmbedding.objects.filter(
                            owner_type='review',
                            owner_id=review.id,
                            model=semantic_search_service.ai_provider
                        ).delete()
                        
                        if semantic_search_service._get_or_create_embedding('review', review.id, review.body_markdown):
                            created += 1
                            self.stdout.write(f'  ✓ Recreated embedding for review: {review.title}')
                        else:
                            failed += 1
                            self.stdout.write(f'  ✗ Failed to create embedding for review: {review.title}')
                    else:
                        skipped += 1
                        self.stdout.write(f'  - Skipped review (embedding exists): {review.title}')
            except Exception as e:
                failed += 1
                self.stdout.write(f'  ✗ Error creating embedding for review {review.title}: {e}')

        return created, skipped, failed

    def _create_file_embeddings(self, force=False):
        """Create embeddings for extracted file text."""
        created = 0
        skipped = 0
        failed = 0

        files = BookFile.objects.filter(
            text_extracted=True,
            extracted_text__isnull=False
        ).exclude(extracted_text='')
        total_files = files.count()

        self.stdout.write(f'Processing {total_files} files...')

        for book_file in files:
            try:
                if semantic_search_service._get_or_create_embedding('file_text', book_file.id, book_file.extracted_text):
                    created += 1
                    self.stdout.write(f'  ✓ Created embedding for file: {book_file.file_path}')
                else:
                    if force:
                        from search.models import SearchEmbedding
                        SearchEmbedding.objects.filter(
                            owner_type='file_text',
                            owner_id=book_file.id,
                            model=semantic_search_service.ai_provider
                        ).delete()
                        
                        if semantic_search_service._get_or_create_embedding('file_text', book_file.id, book_file.extracted_text):
                            created += 1
                            self.stdout.write(f'  ✓ Recreated embedding for file: {book_file.file_path}')
                        else:
                            failed += 1
                            self.stdout.write(f'  ✗ Failed to create embedding for file: {book_file.file_path}')
                    else:
                        skipped += 1
                        self.stdout.write(f'  - Skipped file (embedding exists): {book_file.file_path}')
            except Exception as e:
                failed += 1
                self.stdout.write(f'  ✗ Error creating embedding for file {book_file.file_path}: {e}')

        return created, skipped, failed
