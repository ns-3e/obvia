from django.contrib import admin
from .models import Book, Author, Tag, Shelf, Chapter, Section, SubSection, PageRange


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'primary_isbn_13', 'publisher', 'publication_date', 'source', 'created_at']
    list_filter = ['source', 'language', 'publication_date', 'created_at']
    search_fields = ['title', 'subtitle', 'description', 'primary_isbn_13', 'isbn_10', 'publisher']
    readonly_fields = ['id', 'created_at', 'updated_at']
    filter_horizontal = ['authors']
    ordering = ['-created_at']


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']
    ordering = ['name']


@admin.register(Shelf)
class ShelfAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_system', 'created_at']
    list_filter = ['is_system']
    search_fields = ['name']
    readonly_fields = ['created_at']
    ordering = ['name']


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ['title', 'book', 'number', 'order', 'created_at']
    list_filter = ['book', 'created_at']
    search_fields = ['title', 'book__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['book', 'order', 'number']


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'chapter', 'order', 'created_at']
    list_filter = ['chapter__book', 'created_at']
    search_fields = ['title', 'chapter__title', 'chapter__book__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['chapter', 'order']


@admin.register(SubSection)
class SubSectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'section', 'order', 'created_at']
    list_filter = ['section__chapter__book', 'created_at']
    search_fields = ['title', 'section__title', 'section__chapter__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['section', 'order']


@admin.register(PageRange)
class PageRangeAdmin(admin.ModelAdmin):
    list_display = ['start_page', 'end_page', 'get_parent', 'created_at']
    list_filter = ['created_at']
    search_fields = ['start_page', 'end_page']
    readonly_fields = ['created_at']
    ordering = ['start_page']

    def get_parent(self, obj):
        """Get the parent reference for display."""
        if obj.subsection:
            return f"Subsection: {obj.subsection.title}"
        elif obj.section:
            return f"Section: {obj.section.title}"
        elif obj.chapter:
            return f"Chapter: {obj.chapter.title}"
        return "No parent"
    get_parent.short_description = 'Parent Reference'
