from django.contrib import admin
from .models import SearchEmbedding


@admin.register(SearchEmbedding)
class SearchEmbeddingAdmin(admin.ModelAdmin):
    list_display = ['owner_type', 'owner_id', 'model', 'created_at']
    list_filter = ['owner_type', 'model', 'created_at']
    search_fields = ['owner_id']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
