from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.documentation import include_docs_urls
from books.views import BookViewSet, AuthorViewSet, TagViewSet, ShelfViewSet
from libraries.views import LibraryViewSet, LibraryBookViewSet
from notes.views import NoteViewSet, RatingViewSet, ReviewViewSet
from files.views import BookFileViewSet
from search.views import SearchViewSet, SearchEmbeddingViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'books', BookViewSet)
router.register(r'authors', AuthorViewSet)
router.register(r'tags', TagViewSet)
router.register(r'shelves', ShelfViewSet)
router.register(r'libraries', LibraryViewSet)
router.register(r'library-books', LibraryBookViewSet)
router.register(r'notes', NoteViewSet)
router.register(r'ratings', RatingViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'files', BookFileViewSet)
router.register(r'search-embeddings', SearchEmbeddingViewSet)

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
    path('search/', include([
        path('basic/', SearchViewSet.as_view({'get': 'basic'}), name='search-basic'),
        path('semantic/', SearchViewSet.as_view({'post': 'semantic'}), name='search-semantic'),
        path('status/', SearchViewSet.as_view({'get': 'status'}), name='search-status'),
        path('recommendations/', SearchViewSet.as_view({'get': 'recommendations'}), name='search-recommendations'),
    ])),
    path('ratings/', include([
        path('summary/', RatingViewSet.as_view({'get': 'summary'}), name='rating-summary'),
        path('category/', RatingViewSet.as_view({'post': 'category_rating'}), name='rating-category'),
    ])),
    path('shelves/', include([
        path('system/', ShelfViewSet.as_view({'get': 'system_shelves'}), name='shelf-system'),
        path('custom/', ShelfViewSet.as_view({'get': 'custom_shelves'}), name='shelf-custom'),
    ])),
    path('health/', include('obvia_core.health_urls')),
]
