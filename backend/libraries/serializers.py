from rest_framework import serializers
from .models import Library, LibraryBook, LibraryBookTag, ShelfItem
from books.serializers import BookSerializer, TagSerializer, ShelfSerializer, AuthorSerializer


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
    library = LibrarySerializer(read_only=True)
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


# Import/Export Serializers
class LibraryExportSerializer(serializers.ModelSerializer):
    """Serializer for exporting a complete library with all its books and metadata."""
    library_books = serializers.SerializerMethodField()
    
    class Meta:
        model = Library
        fields = ['id', 'name', 'description', 'is_system', 'created_at', 'updated_at', 'library_books']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_library_books(self, obj):
        library_books = obj.library_books.all().prefetch_related(
            'book__authors',
            'tags',
            'shelves'
        )
        return LibraryBookExportSerializer(library_books, many=True).data


class LibraryBookExportSerializer(serializers.ModelSerializer):
    """Serializer for exporting library book data with complete book information."""
    book = BookSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    shelves = ShelfSerializer(many=True, read_only=True)
    
    class Meta:
        model = LibraryBook
        fields = [
            'added_at', 'custom_title', 'custom_notes_summary',
            'book', 'tags', 'shelves'
        ]
        read_only_fields = ['added_at']


class LibraryImportSerializer(serializers.Serializer):
    """Serializer for importing library data."""
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    library_books = serializers.ListField(child=serializers.DictField(), required=False)
    
    def validate_name(self, value):
        """Check that the library name doesn't already exist."""
        if Library.objects.filter(name=value).exists():
            raise serializers.ValidationError(f"A library with the name '{value}' already exists.")
        return value


class BookImportSerializer(serializers.Serializer):
    """Serializer for importing book data."""
    primary_isbn_13 = serializers.CharField(required=False, allow_blank=True)
    isbn_10 = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField(max_length=500)
    subtitle = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    publisher = serializers.CharField(required=False, allow_blank=True)
    publication_date = serializers.DateField(required=False)
    page_count = serializers.IntegerField(required=False, min_value=1)
    language = serializers.CharField(default='en', max_length=10)
    cover_url = serializers.URLField(required=False, allow_blank=True)
    toc_json = serializers.JSONField(required=False)
    source = serializers.CharField(default='import', max_length=50)
    author_names = serializers.ListField(child=serializers.CharField(), required=False)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    shelves = serializers.ListField(child=serializers.CharField(), required=False)
    custom_title = serializers.CharField(required=False, allow_blank=True)
    custom_notes_summary = serializers.CharField(required=False, allow_blank=True)
