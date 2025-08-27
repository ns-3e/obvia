from django.core.management.base import BaseCommand
from libraries.models import Library


class Command(BaseCommand):
    help = 'Create default libraries (Unassigned) if they do not exist'

    def handle(self, *args, **options):
        # Create the "Unassigned" library
        unassigned_library, created = Library.objects.get_or_create(
            name="Unassigned",
            defaults={
                'description': 'Books that are not assigned to any specific library',
                'is_system': True
            }
        )
        
        # Ensure existing "Unassigned" libraries are marked as system libraries
        if not created and not unassigned_library.is_system:
            unassigned_library.is_system = True
            unassigned_library.save()
            self.stdout.write(
                self.style.WARNING(f'Updated existing "Unassigned" library to be a system library')
            )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created "Unassigned" library')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'"Unassigned" library already exists')
            )
        
        self.stdout.write(
            self.style.SUCCESS('Default libraries setup complete')
        )
