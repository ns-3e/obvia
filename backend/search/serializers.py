from rest_framework import serializers
from .models import SearchEmbedding


class SearchEmbeddingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchEmbedding
        fields = ['id', 'owner_type', 'owner_id', 'vector', 'model', 'created_at']
        read_only_fields = ['id', 'created_at']


class SearchResultSerializer(serializers.Serializer):
    """Serializer for search results."""
    id = serializers.CharField()
    title = serializers.CharField()
    type = serializers.CharField()  # book, note, review, file_text
    score = serializers.FloatField()
    snippet = serializers.CharField()
    url = serializers.CharField()


class BasicSearchSerializer(serializers.Serializer):
    """Serializer for basic search parameters."""
    q = serializers.CharField(help_text="Search query")
    library_id = serializers.IntegerField(required=False, help_text="Filter by library ID")
    author = serializers.CharField(required=False, help_text="Filter by author")
    tag = serializers.CharField(required=False, help_text="Filter by tag")
    rating = serializers.IntegerField(required=False, min_value=1, max_value=5, help_text="Filter by rating")
    shelf = serializers.CharField(required=False, help_text="Filter by shelf")


class SemanticSearchSerializer(serializers.Serializer):
    """Serializer for semantic search parameters."""
    query = serializers.CharField(help_text="Search query")
    library_id = serializers.IntegerField(required=False, help_text="Filter by library ID")
    top_k = serializers.IntegerField(default=10, min_value=1, max_value=50, help_text="Number of results to return")
