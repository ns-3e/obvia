import logging
import numpy as np
from typing import List, Dict, Optional, Tuple
from django.conf import settings
from django.db.models import Q
from .models import SearchEmbedding
from books.models import Book
from libraries.models import LibraryBook
from notes.models import Note, Review
from files.models import BookFile

logger = logging.getLogger(__name__)


class SemanticSearchService:
    """Service for semantic search using embeddings."""
    
    def __init__(self):
        self.ai_provider = getattr(settings, 'AI_PROVIDER', 'disabled')
        self.enabled = self.ai_provider != 'disabled'
        
        if self.enabled:
            self._setup_ai_client()
    
    def _setup_ai_client(self):
        """Setup AI client based on provider."""
        if self.ai_provider == 'openai':
            try:
                import openai
                self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                self.model = "text-embedding-3-small"
            except ImportError:
                logger.error("OpenAI library not installed")
                self.enabled = False
            except Exception as e:
                logger.error(f"Failed to setup OpenAI client: {e}")
                self.enabled = False
        elif self.ai_provider == 'local':
            # For local embeddings, we'll use a simple TF-IDF approach
            self.enabled = True
        else:
            self.enabled = False
    
    def is_enabled(self) -> bool:
        """Check if semantic search is enabled."""
        return self.enabled
    
    def create_embeddings(self, text: str) -> Optional[List[float]]:
        """Create embeddings for given text."""
        if not self.enabled:
            return None
        
        try:
            if self.ai_provider == 'openai':
                return self._create_openai_embeddings(text)
            elif self.ai_provider == 'local':
                return self._create_local_embeddings(text)
        except Exception as e:
            logger.error(f"Failed to create embeddings: {e}")
            return None
    
    def _create_openai_embeddings(self, text: str) -> List[float]:
        """Create embeddings using OpenAI API."""
        response = self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return response.data[0].embedding
    
    def _create_local_embeddings(self, text: str) -> List[float]:
        """Create simple local embeddings using TF-IDF approach."""
        # This is a simplified approach - in production you might use sentence-transformers
        words = text.lower().split()
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Create a simple vector representation
        # In a real implementation, you'd use a proper embedding model
        vector = [word_freq.get(word, 0) for word in set(words)]
        
        # Normalize to unit vector
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = [v / norm for v in vector]
        
        return vector
    
    def search(self, query: str, library_id: Optional[str] = None, top_k: int = 10) -> List[Dict]:
        """Perform semantic search."""
        if not self.enabled:
            return []
        
        try:
            # Create query embedding
            query_embedding = self.create_embeddings(query)
            if not query_embedding:
                return []
            
            # Get all embeddings
            embeddings = self._get_embeddings(library_id)
            
            # Calculate similarities
            similarities = []
            for embedding in embeddings:
                similarity = self._calculate_similarity(query_embedding, embedding['vector'])
                similarities.append({
                    **embedding,
                    'similarity_score': similarity
                })
            
            # Sort by similarity and return top results
            similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
            return similarities[:top_k]
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    def _get_embeddings(self, library_id: Optional[str] = None) -> List[Dict]:
        """Get all embeddings from database."""
        embeddings = []
        
        # Get book embeddings
        book_queryset = Book.objects.all()
        if library_id:
            book_queryset = book_queryset.filter(librarybook__library_id=library_id)
        
        for book in book_queryset:
            if book.description:
                embedding = self._get_or_create_embedding(
                    'book', book.id, book.description
                )
                if embedding:
                    embeddings.append({
                        'id': str(book.id),
                        'title': book.title,
                        'type': 'book',
                        'content': book.description,
                        'vector': embedding,
                        'url': f'/api/books/{book.id}/'
                    })
        
        # Get note embeddings
        note_queryset = Note.objects.all()
        if library_id:
            note_queryset = note_queryset.filter(library_book__library_id=library_id)
        
        for note in note_queryset:
            if note.content_markdown:
                embedding = self._get_or_create_embedding(
                    'note', note.id, note.content_markdown
                )
                if embedding:
                    embeddings.append({
                        'id': str(note.id),
                        'title': note.title,
                        'type': 'note',
                        'content': note.content_markdown,
                        'vector': embedding,
                        'url': f'/api/notes/{note.id}/'
                    })
        
        # Get review embeddings
        review_queryset = Review.objects.all()
        if library_id:
            review_queryset = review_queryset.filter(library_book__library_id=library_id)
        
        for review in review_queryset:
            if review.body_markdown:
                embedding = self._get_or_create_embedding(
                    'review', review.id, review.body_markdown
                )
                if embedding:
                    embeddings.append({
                        'id': str(review.id),
                        'title': review.title,
                        'type': 'review',
                        'content': review.body_markdown,
                        'vector': embedding,
                        'url': f'/api/reviews/{review.id}/'
                    })
        
        # Get file text embeddings
        file_queryset = BookFile.objects.filter(text_extracted=True)
        if library_id:
            file_queryset = file_queryset.filter(library_book__library_id=library_id)
        
        for book_file in file_queryset:
            if book_file.extracted_text:
                embedding = self._get_or_create_embedding(
                    'file_text', book_file.id, book_file.extracted_text
                )
                if embedding:
                    embeddings.append({
                        'id': str(book_file.id),
                        'title': f"{book_file.library_book.book.title} - {book_file.file_type.upper()}",
                        'type': 'file_text',
                        'content': book_file.extracted_text,
                        'vector': embedding,
                        'url': f'/api/files/{book_file.id}/'
                    })
        
        return embeddings
    
    def _get_or_create_embedding(self, owner_type: str, owner_id: int, text: str) -> Optional[List[float]]:
        """Get existing embedding or create new one."""
        try:
            # Try to get existing embedding
            embedding_obj = SearchEmbedding.objects.filter(
                owner_type=owner_type,
                owner_id=owner_id,
                model=self.ai_provider
            ).first()
            
            if embedding_obj:
                # Convert binary field back to list
                vector_bytes = embedding_obj.vector
                vector = np.frombuffer(vector_bytes, dtype=np.float32).tolist()
                return vector
            
            # Create new embedding
            vector = self.create_embeddings(text)
            if vector:
                # Convert list to binary field
                vector_bytes = np.array(vector, dtype=np.float32).tobytes()
                
                SearchEmbedding.objects.create(
                    owner_type=owner_type,
                    owner_id=owner_id,
                    vector=vector_bytes,
                    model=self.ai_provider
                )
                
                return vector
            
        except Exception as e:
            logger.error(f"Failed to get/create embedding for {owner_type} {owner_id}: {e}")
        
        return None
    
    def _calculate_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        try:
            # Ensure vectors have same length (pad with zeros if needed)
            max_len = max(len(vec1), len(vec2))
            vec1_padded = vec1 + [0] * (max_len - len(vec1))
            vec2_padded = vec2 + [0] * (max_len - len(vec2))
            
            # Convert to numpy arrays
            v1 = np.array(vec1_padded)
            v2 = np.array(vec2_padded)
            
            # Calculate cosine similarity
            dot_product = np.dot(v1, v2)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    def create_snippet(self, content: str, query: str, max_length: int = 200) -> str:
        """Create a snippet highlighting the query context."""
        if not content or not query:
            return content[:max_length] + '...' if len(content) > max_length else content
        
        # Find query in content (case insensitive)
        query_lower = query.lower()
        content_lower = content.lower()
        
        pos = content_lower.find(query_lower)
        if pos != -1:
            # Extract context around the query
            start = max(0, pos - max_length // 2)
            end = min(len(content), pos + len(query) + max_length // 2)
            
            snippet = content[start:end]
            
            # Add ellipsis if needed
            if start > 0:
                snippet = '...' + snippet
            if end < len(content):
                snippet = snippet + '...'
            
            return snippet
        
        # If query not found, return beginning of content
        return content[:max_length] + '...' if len(content) > max_length else content


# Global instance
semantic_search_service = SemanticSearchService()
