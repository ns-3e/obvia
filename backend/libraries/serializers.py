from rest_framework import serializers
from .models import Library, LibraryBook, LibraryBookTag, ShelfItem
from books.serializers import BookSerializer, TagSerializer, ShelfSerializer


class LibrarySerializer(serializers.ModelSerializer):
    library_books_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Library
        fields = ['id', 'name', 'description', 'created_at', 'updated_at', 'library_books_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'library_books_count']
    
    def get_library_books_count(self, obj):
        return obj.library_books.count()


class LibraryBookSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    shelves = ShelfSerializer(many=True, read_only=True)
    display_title = serializers.CharField(read_only=True)

    class Meta:
        model = LibraryBook
        fields = [
            'id', 'library', 'book', 'added_at', 'custom_title', 'custom_notes_summary',
            'tags', 'shelves', 'display_title'
        ]
        read_only_fields = ['id', 'added_at']


class LibraryBookCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryBook
        fields = ['library', 'book', 'custom_title', 'custom_notes_summary']


class LibraryBookTagSerializer(serializers.ModelSerializer):
    tag = TagSerializer(read_only=True)

    class Meta:
        model = LibraryBookTag
        fields = ['id', 'library_book', 'tag', 'added_at']
        read_only_fields = ['id', 'added_at']


class ShelfItemSerializer(serializers.ModelSerializer):
    shelf = ShelfSerializer(read_only=True)

    class Meta:
        model = ShelfItem
        fields = ['id', 'shelf', 'library_book', 'added_at']
        read_only_fields = ['id', 'added_at']
