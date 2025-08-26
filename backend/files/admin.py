from django.contrib import admin
from .models import BookFile


@admin.register(BookFile)
class BookFileAdmin(admin.ModelAdmin):
    list_display = ['library_book', 'file_type', 'size_mb', 'text_extracted', 'uploaded_at']
    list_filter = ['file_type', 'text_extracted', 'uploaded_at']
    search_fields = ['library_book__book__title', 'filename']
    readonly_fields = ['checksum', 'uploaded_at', 'size_mb']
    ordering = ['-uploaded_at']
