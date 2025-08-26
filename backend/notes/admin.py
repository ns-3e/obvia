from django.contrib import admin
from .models import Note, Rating, Review


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'library_book', 'ai_generated', 'created_at']
    list_filter = ['ai_generated', 'created_at']
    search_fields = ['title', 'content_markdown', 'library_book__book__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ['library_book', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['library_book__book__title']
    readonly_fields = ['created_at']
    ordering = ['-created_at']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['title', 'library_book', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'body_markdown', 'library_book__book__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
