from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.documentation import include_docs_urls
from books.views import BookViewSet, AuthorViewSet, TagViewSet, ShelfViewSet, ChapterViewSet, SectionViewSet, SubSectionViewSet, PageRangeViewSet
from libraries.views import LibraryViewSet, LibraryBookViewSet
from notes.views import NoteViewSet, RatingViewSet, ReviewViewSet, DiagramViewSet, NoteDiagramViewSet
from files.views import BookFileViewSet
from search.views import SearchViewSet, SearchEmbeddingViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'books', BookViewSet)
router.register(r'authors', AuthorViewSet)
router.register(r'tags', TagViewSet)
router.register(r'shelves', ShelfViewSet)
router.register(r'chapters', ChapterViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'subsections', SubSectionViewSet)
router.register(r'page-ranges', PageRangeViewSet)
router.register(r'libraries', LibraryViewSet)
router.register(r'library-books', LibraryBookViewSet)
router.register(r'notes', NoteViewSet)
router.register(r'ratings', RatingViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'diagrams', DiagramViewSet)
router.register(r'note-diagrams', NoteDiagramViewSet)
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


    path('books/', include([
        path('search-covers/', BookViewSet.as_view({'post': 'search_covers'}), name='book-search-covers'),
        path('categorize/', BookViewSet.as_view({'post': 'categorize'}), name='book-categorize'),
    ])),

    path('health/', include('obvia_core.health_urls')),
]
