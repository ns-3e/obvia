from django.contrib import admin
from .models import Note, Rating, Review, Diagram, NoteDiagram


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'library_book', 'ai_generated', 'get_reference', 'created_at']
    list_filter = ['ai_generated', 'created_at', 'ref_book', 'ref_chapter', 'ref_section', 'ref_subsection']
    search_fields = ['title', 'content_markdown', 'library_book__book__title']
    readonly_fields = ['created_at', 'updated_at', 'reference_path']
    ordering = ['-created_at']

    def get_reference(self, obj):
        """Get the reference for display."""
        if obj.ref_subsection:
            return f"Subsection: {obj.ref_subsection.title}"
        elif obj.ref_section:
            return f"Section: {obj.ref_section.title}"
        elif obj.ref_chapter:
            return f"Chapter: {obj.ref_chapter.title}"
        elif obj.ref_book:
            return f"Book: {obj.ref_book.title}"
        return "General Note"
    get_reference.short_description = 'Reference'


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ['library_book', 'rating', 'category', 'created_at']
    list_filter = ['rating', 'category', 'created_at']
    search_fields = ['library_book__book__title', 'category']
    readonly_fields = ['created_at']
    ordering = ['-created_at']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['title', 'library_book', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'body_markdown', 'library_book__book__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Diagram)
class DiagramAdmin(admin.ModelAdmin):
    list_display = ['title', 'width', 'height', 'file_size', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at', 'file_size']
    ordering = ['-created_at']


@admin.register(NoteDiagram)
class NoteDiagramAdmin(admin.ModelAdmin):
    list_display = ['note', 'diagram', 'order', 'created_at']
    list_filter = ['created_at']
    search_fields = ['note__title', 'diagram__title']
    readonly_fields = ['created_at']
    ordering = ['note', 'order']
