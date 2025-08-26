from django.db import models
from books.models import Book, Tag, Shelf


class Library(models.Model):
    """Library model for organizing book collections."""
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Libraries'

    def __str__(self):
        return self.name


class LibraryBook(models.Model):
    """LibraryBook model for books in a specific library."""
    library = models.ForeignKey(Library, on_delete=models.CASCADE, related_name='library_books')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='library_books')
    added_at = models.DateTimeField(auto_now_add=True)
    custom_title = models.CharField(max_length=500, null=True, blank=True)
    custom_notes_summary = models.TextField(null=True, blank=True)
    tags = models.ManyToManyField(Tag, through='LibraryBookTag', blank=True)
    shelves = models.ManyToManyField(Shelf, through='ShelfItem', blank=True)

    class Meta:
        ordering = ['-added_at']
        unique_together = ['library', 'book']

    def __str__(self):
        return f"{self.book.title} in {self.library.name}"

    @property
    def display_title(self):
        """Return custom title if set, otherwise book title."""
        return self.custom_title or self.book.title


class LibraryBookTag(models.Model):
    """Through model for LibraryBook-Tag relationship."""
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['library_book', 'tag']

    def __str__(self):
        return f"{self.library_book} - {self.tag}"


class ShelfItem(models.Model):
    """Through model for Shelf-LibraryBook relationship."""
    shelf = models.ForeignKey(Shelf, on_delete=models.CASCADE)
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['shelf', 'library_book']

    def __str__(self):
        return f"{self.library_book} on {self.shelf}"
