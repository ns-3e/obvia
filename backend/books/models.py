import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Author(models.Model):
    """Author model for book authors."""
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Book(models.Model):
    """Book model for storing book metadata."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    primary_isbn_13 = models.CharField(max_length=13, unique=True, null=True, blank=True)
    isbn_10 = models.CharField(max_length=10, null=True, blank=True)
    title = models.CharField(max_length=500)
    subtitle = models.CharField(max_length=500, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    publisher = models.CharField(max_length=255, null=True, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)
    language = models.CharField(max_length=10, default='en')
    cover_url = models.URLField(max_length=500, null=True, blank=True)
    toc_json = models.JSONField(null=True, blank=True)  # Table of contents
    source = models.CharField(max_length=50, default='manual')  # google_books, open_library, manual
    authors = models.ManyToManyField(Author, related_name='books')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['primary_isbn_13']),
            models.Index(fields=['title']),
            models.Index(fields=['source']),
        ]

    def __str__(self):
        return self.title

    @property
    def display_isbn(self):
        """Return the primary ISBN for display."""
        return self.primary_isbn_13 or self.isbn_10 or 'No ISBN'


class Tag(models.Model):
    """Tag model for categorizing books."""
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Shelf(models.Model):
    """Shelf model for organizing books."""
    name = models.CharField(max_length=100, unique=True)
    is_system = models.BooleanField(default=False)  # For system shelves like wishlist, reading, finished
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @classmethod
    def get_system_shelves(cls):
        """Get or create system shelves."""
        system_names = ['wishlist', 'reading', 'finished']
        shelves = []
        for name in system_names:
            shelf, created = cls.objects.get_or_create(
                name=name,
                defaults={'is_system': True}
            )
            shelves.append(shelf)
        return shelves
