import hashlib
import os
from django.db import models
from django.core.validators import FileExtensionValidator
from libraries.models import LibraryBook


class BookFile(models.Model):
    """BookFile model for uploaded book files."""
    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('epub', 'EPUB'),
    ]

    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE, related_name='files')
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file_path = models.CharField(max_length=500)  # Path to file on disk
    object_key = models.CharField(max_length=500, null=True, blank=True)  # For object storage
    bytes = models.BigIntegerField()  # File size in bytes
    checksum = models.CharField(max_length=64)  # SHA-256 hash
    uploaded_at = models.DateTimeField(auto_now_add=True)
    text_extracted = models.BooleanField(default=False)
    extracted_text = models.TextField(null=True, blank=True)  # Extracted text content

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.library_book} - {self.file_type} ({self.bytes} bytes)"

    def save(self, *args, **kwargs):
        # Calculate checksum if not provided
        if not self.checksum and self.file_path and os.path.exists(self.file_path):
            self.checksum = self._calculate_checksum()
        super().save(*args, **kwargs)

    def _calculate_checksum(self):
        """Calculate SHA-256 checksum of the file."""
        sha256_hash = hashlib.sha256()
        with open(self.file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()

    @property
    def filename(self):
        """Get the filename from the file path."""
        return os.path.basename(self.file_path)

    @property
    def size_mb(self):
        """Get file size in MB."""
        return round(self.bytes / (1024 * 1024), 2)
