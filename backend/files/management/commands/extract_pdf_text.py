from django.core.management.base import BaseCommand
from files.models import BookFile
from django.core.files.storage import default_storage
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Extract text from PDF files that have not been processed yet'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-extract text from all PDF files, even if already extracted',
        )
        parser.add_argument(
            '--file-id',
            type=int,
            help='Extract text from a specific file ID',
        )

    def handle(self, *args, **options):
        force = options['force']
        file_id = options['file_id']
        
        if file_id:
            # Process specific file
            try:
                book_file = BookFile.objects.get(id=file_id)
                if book_file.file_type != 'pdf':
                    self.stdout.write(
                        self.style.ERROR(f'File {file_id} is not a PDF file')
                    )
                    return
                
                self.process_file(book_file, force)
            except BookFile.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'File with ID {file_id} not found')
                )
        else:
            # Process all PDF files
            queryset = BookFile.objects.filter(file_type='pdf')
            
            if not force:
                queryset = queryset.filter(text_extracted=False)
            
            total_files = queryset.count()
            self.stdout.write(f"Found {total_files} PDF files to process")
            
            if total_files == 0:
                self.stdout.write(self.style.WARNING("No PDF files to process"))
                return
            
            processed = 0
            failed = 0
            
            for book_file in queryset:
                try:
                    success = self.process_file(book_file, force)
                    if success:
                        processed += 1
                    else:
                        failed += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"Error processing file {book_file.id}: {str(e)}")
                    )
                    failed += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Processing complete: {processed} successful, {failed} failed"
                )
            )
    
    def process_file(self, book_file, force=False):
        """Process a single PDF file."""
        if not force and book_file.text_extracted:
            self.stdout.write(f"File {book_file.id} already has text extracted, skipping")
            return True
        
        self.stdout.write(f"Processing file {book_file.id}: {book_file.file_path}")
        
        try:
            from pypdf import PdfReader
            
            # Check if file exists
            if not default_storage.exists(book_file.file_path):
                self.stdout.write(
                    self.style.ERROR(f"File not found: {book_file.file_path}")
                )
                return False
            
            # Get the full file path
            file_path = default_storage.path(book_file.file_path)
            
            # Read PDF and extract text
            reader = PdfReader(file_path)
            text_content = []
            
            for i, page in enumerate(reader.pages):
                try:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f"Error extracting text from page {i+1}: {str(e)}")
                    )
            
            if not text_content:
                self.stdout.write(
                    self.style.WARNING(f"No text extracted from file {book_file.id}")
                )
                book_file.text_extracted = False
                book_file.save()
                return False
            
            # Join all text content
            extracted_text = '\n\n'.join(text_content)
            
            # Update the book file record
            book_file.extracted_text = extracted_text
            book_file.text_extracted = True
            book_file.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully extracted {len(extracted_text)} characters from file {book_file.id}"
                )
            )
            return True
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to extract text from file {book_file.id}: {str(e)}")
            )
            book_file.text_extracted = False
            book_file.save()
            return False
