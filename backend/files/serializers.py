from rest_framework import serializers
from .models import BookFile, PDFHighlight


class BookFileSerializer(serializers.ModelSerializer):
    filename = serializers.CharField(read_only=True)
    size_mb = serializers.FloatField(read_only=True)

    class Meta:
        model = BookFile
        fields = [
            'id', 'library_book', 'file_type', 'file_path', 'object_key',
            'bytes', 'checksum', 'uploaded_at', 'text_extracted', 'extracted_text',
            'filename', 'size_mb'
        ]
        read_only_fields = [
            'id', 'file_path', 'object_key', 'bytes', 'checksum', 'uploaded_at',
            'text_extracted', 'filename', 'size_mb'
        ]


class BookFileUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = BookFile
        fields = ['library_book', 'file_type', 'file']

    def validate_file(self, value):
        # Validate file size
        if value.size > 50 * 1024 * 1024:  # 50MB
            raise serializers.ValidationError("File size must be less than 50MB")
        
        # Validate file type
        allowed_types = ['application/pdf', 'application/epub+zip']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Only PDF and EPUB files are allowed")
        
        return value


class PDFHighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = PDFHighlight
        fields = '__all__'


class PDFHighlightCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PDFHighlight
        fields = ['book_file', 'text', 'page', 'x', 'y', 'width', 'height', 'color']
