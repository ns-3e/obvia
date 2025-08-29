from rest_framework import serializers
from .models import Note, Rating, Review, Diagram, NoteDiagram
from books.serializers import BookSerializer, ChapterSerializer, SectionSerializer, SubSectionSerializer


class DiagramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagram
        fields = [
            'id', 'title', 'description', 'excalidraw_data', 'preview_svg',
            'width', 'height', 'file_size', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'file_size', 'created_at', 'updated_at']


class NoteDiagramSerializer(serializers.ModelSerializer):
    diagram = DiagramSerializer(read_only=True)

    class Meta:
        model = NoteDiagram
        fields = ['id', 'diagram', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class NoteSerializer(serializers.ModelSerializer):
    ref_book = BookSerializer(read_only=True)
    ref_chapter = ChapterSerializer(read_only=True)
    ref_section = SectionSerializer(read_only=True)
    ref_subsection = SubSectionSerializer(read_only=True)
    note_diagrams = NoteDiagramSerializer(many=True, read_only=True)
    reference_path = serializers.CharField(read_only=True)

    class Meta:
        model = Note
        fields = [
            'id', 'library_book', 'title', 'content_markdown', 'content_html',
            'content_blocks', 'content_blocks_html', 'ref_book', 'ref_chapter',
            'ref_section', 'ref_subsection', 'section_ref', 'note_diagrams',
            'reference_path', 'created_at', 'updated_at', 'ai_generated'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'reference_path']


class NoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = [
            'library_book', 'title', 'content_markdown', 'content_blocks',
            'ref_book', 'ref_chapter', 'ref_section', 'ref_subsection',
            'section_ref', 'ai_generated'
        ]

    def validate(self, data):
        """Validate that only one reference is set."""
        ref_count = sum([
            bool(data.get('ref_book')),
            bool(data.get('ref_chapter')),
            bool(data.get('ref_section')),
            bool(data.get('ref_subsection'))
        ])
        if ref_count > 1:
            raise serializers.ValidationError("Note can only reference one level of the book hierarchy.")
        return data


class NoteUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = [
            'title', 'content_markdown', 'content_blocks',
            'ref_book', 'ref_chapter', 'ref_section', 'ref_subsection',
            'section_ref', 'ai_generated'
        ]

    def validate(self, data):
        """Validate that only one reference is set."""
        ref_count = sum([
            bool(data.get('ref_book')),
            bool(data.get('ref_chapter')),
            bool(data.get('ref_section')),
            bool(data.get('ref_subsection'))
        ])
        if ref_count > 1:
            raise serializers.ValidationError("Note can only reference one level of the book hierarchy.")
        return data


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id', 'library_book', 'rating', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'library_book', 'title', 'body_markdown', 'body_html', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['library_book', 'title', 'body_markdown']


# Serializers for diagram management
class DiagramCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagram
        fields = ['title', 'description', 'excalidraw_data', 'width', 'height']


class DiagramUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagram
        fields = ['title', 'description', 'excalidraw_data', 'preview_svg', 'width', 'height']


class NoteDiagramCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteDiagram
        fields = ['diagram', 'order']
