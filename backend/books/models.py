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


class Chapter(models.Model):
    """Chapter model for book chapters."""
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=500)
    number = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'number', 'title']
        unique_together = ['book', 'order']
        indexes = [
            models.Index(fields=['book', 'order']),
            models.Index(fields=['book', 'number']),
        ]

    def __str__(self):
        number_text = f"{self.number}. " if self.number else ""
        return f"{number_text}{self.title}"


class Section(models.Model):
    """Section model for chapter sections."""
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=500)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'title']
        unique_together = ['chapter', 'order']
        indexes = [
            models.Index(fields=['chapter', 'order']),
        ]

    def __str__(self):
        return f"{self.chapter.title} - {self.title}"


class SubSection(models.Model):
    """SubSection model for section subsections."""
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='subsections')
    title = models.CharField(max_length=500)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'title']
        unique_together = ['section', 'order']
        indexes = [
            models.Index(fields=['section', 'order']),
        ]

    def __str__(self):
        return f"{self.section.title} - {self.title}"


class PageRange(models.Model):
    """PageRange model for page references (optional, future-proofing)."""
    subsection = models.ForeignKey(SubSection, on_delete=models.CASCADE, related_name='page_ranges', null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='page_ranges', null=True, blank=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='page_ranges', null=True, blank=True)
    start_page = models.PositiveIntegerField()
    end_page = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_page']
        indexes = [
            models.Index(fields=['start_page', 'end_page']),
        ]

    def __str__(self):
        end_text = f"-{self.end_page}" if self.end_page else ""
        return f"Pages {self.start_page}{end_text}"

    def clean(self):
        """Validate that only one parent reference is set."""
        from django.core.exceptions import ValidationError
        parent_count = sum([
            bool(self.subsection),
            bool(self.section),
            bool(self.chapter)
        ])
        if parent_count != 1:
            raise ValidationError("PageRange must reference exactly one parent (subsection, section, or chapter).")


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
