from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from libraries.models import LibraryBook
from books.models import Book, Chapter, Section, SubSection


class Note(models.Model):
    """Note model for book notes and annotations."""
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=255)
    content_markdown = models.TextField()
    content_html = models.TextField(blank=True)  # Rendered HTML from markdown
    # New fields for block-structured content
    content_blocks = models.JSONField(null=True, blank=True)  # Block-structured content for rich editor
    content_blocks_html = models.TextField(blank=True)  # Rendered HTML from blocks
    # Polymorphic references to book hierarchy
    ref_book = models.ForeignKey(Book, on_delete=models.SET_NULL, null=True, blank=True, related_name='referenced_notes')
    ref_chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True, related_name='referenced_notes')
    ref_section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name='referenced_notes')
    ref_subsection = models.ForeignKey(SubSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='referenced_notes')
    # Legacy field for backward compatibility
    section_ref = models.CharField(max_length=255, null=True, blank=True)  # Reference to book section
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ai_generated = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ref_book']),
            models.Index(fields=['ref_chapter']),
            models.Index(fields=['ref_section']),
            models.Index(fields=['ref_subsection']),
        ]

    def __str__(self):
        return f"{self.title} - {self.library_book}"

    def clean(self):
        """Validate that only one reference is set."""
        from django.core.exceptions import ValidationError
        ref_count = sum([
            bool(self.ref_book),
            bool(self.ref_chapter),
            bool(self.ref_section),
            bool(self.ref_subsection)
        ])
        if ref_count > 1:
            raise ValidationError("Note can only reference one level of the book hierarchy.")

    @property
    def reference_path(self):
        """Get the full reference path for display."""
        parts = []
        if self.ref_book:
            parts.append(self.ref_book.title)
        if self.ref_chapter:
            parts.append(f"Chapter: {self.ref_chapter.title}")
        if self.ref_section:
            parts.append(f"Section: {self.ref_section.title}")
        if self.ref_subsection:
            parts.append(f"Subsection: {self.ref_subsection.title}")
        return " > ".join(parts) if parts else "General Note"


class Diagram(models.Model):
    """Diagram model for Excalidraw diagrams."""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # Excalidraw data
    excalidraw_data = models.JSONField()  # Full Excalidraw JSON data
    # Optional preview images
    preview_png = models.BinaryField(null=True, blank=True)  # PNG preview
    preview_svg = models.TextField(blank=True)  # SVG preview
    # Metadata
    width = models.PositiveIntegerField(default=800)
    height = models.PositiveIntegerField(default=600)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def file_size(self):
        """Get the size of the excalidraw data in bytes."""
        import json
        return len(json.dumps(self.excalidraw_data))


class NoteDiagram(models.Model):
    """Through model for Note-Diagram M2M relationship."""
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='note_diagrams')
    diagram = models.ForeignKey(Diagram, on_delete=models.CASCADE, related_name='note_diagrams')
    order = models.PositiveIntegerField(default=0)  # Order within the note
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']
        unique_together = ['note', 'diagram']

    def __str__(self):
        return f"{self.note.title} - {self.diagram.title}"


class Rating(models.Model):
    """Rating model for book ratings."""
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE, related_name='ratings')
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    category = models.CharField(max_length=100, null=True, blank=True, help_text="Category for the rating (e.g., 'overall', 'plot', 'characters')")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['library_book', 'category']  # One rating per category per book

    def __str__(self):
        category_text = f" ({self.category})" if self.category else ""
        return f"{self.rating}/5{category_text} - {self.library_book}"


class Review(models.Model):
    """Review model for book reviews."""
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE, related_name='reviews')
    title = models.CharField(max_length=255)
    body_markdown = models.TextField()
    body_html = models.TextField(blank=True)  # Rendered HTML from markdown
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.library_book}"
