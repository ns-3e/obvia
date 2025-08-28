import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from libraries.models import Library
from libraries.serializers import LibraryExportSerializer


class Command(BaseCommand):
    help = 'Export a library with all its books and metadata to a JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            'library_name',
            type=str,
            help='Name of the library to export'
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Output file path (optional, defaults to library_name_timestamp.json)'
        )
        parser.add_argument(
            '--pretty',
            action='store_true',
            help='Pretty print the JSON output'
        )

    def handle(self, *args, **options):
        library_name = options['library_name']
        output_path = options['output']
        pretty = options['pretty']

        try:
            # Find the library
            try:
                library = Library.objects.get(name=library_name)
            except Library.DoesNotExist:
                raise CommandError(f'Library "{library_name}" not found')

            # Prevent export of system libraries
            if library.is_system:
                raise CommandError(f'The "{library_name}" library is a system library and cannot be exported')

            # Serialize the library data
            serializer = LibraryExportSerializer(library)
            data = serializer.data

            # Determine output file path
            if not output_path:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                safe_name = library_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
                output_path = f"{safe_name}_{timestamp}.json"

            # Ensure output directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)

            # Write to file
            with open(output_path, 'w', encoding='utf-8') as f:
                if pretty:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                else:
                    json.dump(data, f, ensure_ascii=False)

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully exported library "{library_name}" to {output_path}'
                )
            )
            self.stdout.write(f'Library contains {len(data.get("library_books", []))} books')

        except Exception as e:
            raise CommandError(f'Export failed: {str(e)}')
