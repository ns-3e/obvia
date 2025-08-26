import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Filter, Search, Tag, Star, BookOpen } from 'lucide-react'
import { librariesAPI, tagsAPI, shelvesAPI } from '../utils/api'
import BookCard from '../components/BookCard'

const LibraryDetail = () => {
  const { libraryId } = useParams()
  const [library, setLibrary] = useState(null)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    q: '',
    author: '',
    tag: '',
    rating: '',
    shelf: ''
  })
  const [availableTags, setAvailableTags] = useState([])
  const [availableShelves, setAvailableShelves] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadLibrary()
    loadTags()
    loadShelves()
  }, [libraryId])

  useEffect(() => {
    loadBooks()
  }, [libraryId, filters])

  const loadLibrary = async () => {
    try {
      const response = await librariesAPI.getById(libraryId)
      setLibrary(response.data)
    } catch (error) {
      console.error('Failed to load library:', error)
    }
  }

  const loadBooks = async () => {
    try {
      setLoading(true)
      const params = { ...filters }
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })
      
      const response = await librariesAPI.getBooks(libraryId, params)
      setBooks(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load books:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTags = async () => {
    try {
      const response = await tagsAPI.getAll()
      setAvailableTags(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const loadShelves = async () => {
    try {
      const response = await shelvesAPI.getAll()
      setAvailableShelves(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load shelves:', error)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      q: '',
      author: '',
      tag: '',
      rating: '',
      shelf: ''
    })
  }

  if (loading && !library) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading library...</p>
        </div>
      </div>
    )
  }

  if (!library) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Library not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {library.name}
            </h1>
            {library.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {library.description}
              </p>
            )}
          </div>
        </div>
        
        <Link
          to="/add"
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Book</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filters
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Title, author, ISBN..."
                  value={filters.q}
                  onChange={(e) => handleFilterChange('q', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Author */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author
              </label>
              <input
                type="text"
                placeholder="Author name"
                value={filters.author}
                onChange={(e) => handleFilterChange('author', e.target.value)}
                className="input"
              />
            </div>

            {/* Tag */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tag
              </label>
              <select
                value={filters.tag}
                onChange={(e) => handleFilterChange('tag', e.target.value)}
                className="input"
              >
                <option value="">All tags</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="input"
              >
                <option value="">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
                <option value="2">2+ stars</option>
                <option value="1">1+ stars</option>
              </select>
            </div>

            {/* Shelf */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shelf
              </label>
              <select
                value={filters.shelf}
                onChange={(e) => handleFilterChange('shelf', e.target.value)}
                className="input"
              >
                <option value="">All shelves</option>
                {availableShelves.map((shelf) => (
                  <option key={shelf.id} value={shelf.id}>
                    {shelf.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn-outline w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Books Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Books ({books.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No books found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {Object.values(filters).some(f => f) 
                ? 'Try adjusting your filters or add some books to this library.'
                : 'Add your first book to get started.'
              }
            </p>
            <Link
              to="/add"
              className="btn-primary"
            >
              Add Book
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book.book}
                libraryId={libraryId}
                libraryBookId={book.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LibraryDetail
