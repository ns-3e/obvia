from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from libraries.models import LibraryBook


class Note(models.Model):
    """Note model for book notes and annotations."""
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=255)
    content_markdown = models.TextField()
    content_html = models.TextField(blank=True)  # Rendered HTML from markdown
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ai_generated = models.BooleanField(default=False)
    section_ref = models.CharField(max_length=255, null=True, blank=True)  # Reference to book section

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.library_book}"


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
