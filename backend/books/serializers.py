from rest_framework import serializers
from .models import Book, Author, Tag, Shelf, Chapter, Section, SubSection, PageRange


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PageRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageRange
        fields = ['id', 'start_page', 'end_page', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubSectionSerializer(serializers.ModelSerializer):
    page_ranges = PageRangeSerializer(many=True, read_only=True)

    class Meta:
        model = SubSection
        fields = ['id', 'title', 'order', 'page_ranges', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SectionSerializer(serializers.ModelSerializer):
    subsections = SubSectionSerializer(many=True, read_only=True)
    page_ranges = PageRangeSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'title', 'order', 'subsections', 'page_ranges', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChapterSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    page_ranges = PageRangeSerializer(many=True, read_only=True)

    class Meta:
        model = Chapter
        fields = ['id', 'title', 'number', 'order', 'sections', 'page_ranges', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True, read_only=True)
    chapters = ChapterSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = [
            'id', 'primary_isbn_13', 'isbn_10', 'title', 'subtitle', 'description',
            'publisher', 'publication_date', 'page_count', 'language', 'cover_url',
            'toc_json', 'source', 'authors', 'chapters', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            'primary_isbn_13', 'isbn_10', 'title', 'subtitle', 'description',
            'publisher', 'publication_date', 'page_count', 'language', 'cover_url',
            'toc_json', 'source'
        ]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class ShelfSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shelf
        fields = ['id', 'name', 'is_system', 'created_at']
        read_only_fields = ['id', 'created_at']


# Serializers for creating/updating hierarchy
class ChapterCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapter
        fields = ['title', 'number', 'order']


class SectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ['title', 'order']


class SubSectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubSection
        fields = ['title', 'order']


class PageRangeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageRange
        fields = ['start_page', 'end_page']
