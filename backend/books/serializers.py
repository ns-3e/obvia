from rest_framework import serializers
from .models import Book, Author, Tag, Shelf


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name', 'created_at']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'created_at']


class ShelfSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shelf
        fields = ['id', 'name', 'is_system', 'created_at']


class BookSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True, read_only=True)
    display_isbn = serializers.CharField(read_only=True)

    class Meta:
        model = Book
        fields = [
            'id', 'primary_isbn_13', 'isbn_10', 'title', 'subtitle', 'description',
            'publisher', 'publication_date', 'page_count', 'language', 'cover_url',
            'toc_json', 'source', 'authors', 'display_isbn', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookCreateSerializer(serializers.ModelSerializer):
    author_names = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Book
        fields = [
            'primary_isbn_13', 'isbn_10', 'title', 'subtitle', 'description',
            'publisher', 'publication_date', 'page_count', 'language', 'cover_url',
            'toc_json', 'source', 'author_names'
        ]

    def create(self, validated_data):
        author_names = validated_data.pop('author_names', [])
        book = Book.objects.create(**validated_data)
        
        # Create or get authors
        for author_name in author_names:
            author, created = Author.objects.get_or_create(name=author_name.strip())
            book.authors.add(author)
        
        return book

    def update(self, instance, validated_data):
        author_names = validated_data.pop('author_names', None)
        
        # Update book fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update authors if provided
        if author_names is not None:
            instance.authors.clear()
            for author_name in author_names:
                author, created = Author.objects.get_or_create(name=author_name.strip())
                instance.authors.add(author)
        
        return instance
