from rest_framework import serializers
from .models import Note, Rating, Review


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = [
            'id', 'library_book', 'title', 'content_markdown', 'content_html',
            'created_at', 'updated_at', 'ai_generated', 'section_ref'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = [
            'library_book', 'title', 'content_markdown', 'ai_generated', 'section_ref'
        ]


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id', 'library_book', 'rating', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            'id', 'library_book', 'title', 'body_markdown', 'body_html',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['library_book', 'title', 'body_markdown']
