from django.contrib import admin
from .models import Book, Author, Tag, Shelf


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'primary_isbn_13', 'publisher', 'publication_date', 'source', 'created_at']
    list_filter = ['source', 'language', 'publication_date']
    search_fields = ['title', 'primary_isbn_13', 'isbn_10', 'publisher']
    filter_horizontal = ['authors']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Shelf)
class ShelfAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_system', 'created_at']
    list_filter = ['is_system']
    search_fields = ['name']
    ordering = ['name']
