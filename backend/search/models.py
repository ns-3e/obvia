from django.db import models

# Create your models here.


class SearchEmbedding(models.Model):
    """SearchEmbedding model for storing embeddings for semantic search."""
    OWNER_TYPE_CHOICES = [
        ('book', 'Book'),
        ('note', 'Note'),
        ('review', 'Review'),
        ('file_text', 'File Text'),
    ]

    owner_type = models.CharField(max_length=20, choices=OWNER_TYPE_CHOICES)
    owner_id = models.CharField(max_length=255)  # UUID or ID of the owner
    vector = models.BinaryField()  # Stored as blob
    model = models.CharField(max_length=100)  # Model used for embedding (e.g., 'text-embedding-ada-002')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['owner_type', 'owner_id', 'model']
        indexes = [
            models.Index(fields=['owner_type', 'owner_id']),
            models.Index(fields=['model']),
        ]

    def __str__(self):
        return f"{self.owner_type}:{self.owner_id} ({self.model})"
