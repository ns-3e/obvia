from django.core.management.base import BaseCommand
from books.models import Shelf


class Command(BaseCommand):
    help = 'Create system shelves (wishlist, reading, finished)'

    def handle(self, *args, **options):
        system_shelves = [
            {'name': 'wishlist'},
            {'name': 'reading'},
            {'name': 'finished'},
        ]

        created_count = 0
        for shelf_data in system_shelves:
            shelf, created = Shelf.objects.get_or_create(
                name=shelf_data['name'],
                defaults={
                    'is_system': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created system shelf: {shelf.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'System shelf already exists: {shelf.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} system shelves')
        )
