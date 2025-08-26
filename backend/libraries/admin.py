from django.contrib import admin
from .models import Library, LibraryBook, LibraryBookTag, ShelfItem


@admin.register(Library)
class LibraryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['-created_at']


@admin.register(LibraryBook)
class LibraryBookAdmin(admin.ModelAdmin):
    list_display = ['library', 'book', 'added_at', 'custom_title']
    list_filter = ['library', 'added_at']
    search_fields = ['book__title', 'library__name', 'custom_title']
    readonly_fields = ['added_at']
    ordering = ['-added_at']


@admin.register(LibraryBookTag)
class LibraryBookTagAdmin(admin.ModelAdmin):
    list_display = ['library_book', 'tag', 'added_at']
    list_filter = ['tag', 'added_at']
    search_fields = ['library_book__book__title', 'tag__name']
    ordering = ['-added_at']


@admin.register(ShelfItem)
class ShelfItemAdmin(admin.ModelAdmin):
    list_display = ['shelf', 'library_book', 'added_at']
    list_filter = ['shelf', 'added_at']
    search_fields = ['shelf__name', 'library_book__book__title']
    ordering = ['-added_at']
