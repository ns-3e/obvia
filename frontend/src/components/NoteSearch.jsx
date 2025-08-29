import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, X, BookOpen, FileText, Clock, Star, Loader } from 'lucide-react'
import { notesAPI } from '../utils/api'
import { useDebounce } from '../hooks/useDebounce'

const NoteSearch = ({ 
  libraryBookId = null, 
  libraryId = null, 
  onNoteClick = null,
  className = '' 
}) => {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('exact') // exact, fuzzy, semantic
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  
  // Debounce the search query to avoid too many API calls
  const debouncedQuery = useDebounce(query, 300)

  const searchTypes = [
    { value: 'exact', label: 'Exact', description: 'Find exact text matches' },
    { value: 'fuzzy', label: 'Fuzzy', description: 'Find similar words and phrases' },
    { value: 'semantic', label: 'Semantic', description: 'Find conceptually related content' }
  ]

  const performSearch = useCallback(async (searchQuery, type) => {
    if (!searchQuery.trim()) {
      setResults([])
      setTotalResults(0)
      setShowResults(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = {
        q: searchQuery,
        type: type,
        limit: 20
      }

      if (libraryBookId) {
        params.library_book_id = libraryBookId
      }

      if (libraryId) {
        params.library_id = libraryId
      }

      const response = await notesAPI.search(params)
      setResults(response.data.results || [])
      setTotalResults(response.data.total || 0)
      setShowResults(true)
    } catch (error) {
      console.error('Search failed:', error)
      setError('Search failed. Please try again.')
      setResults([])
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }, [libraryBookId, libraryId])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery, searchType)
    } else {
      setResults([])
      setTotalResults(0)
      setShowResults(false)
    }
  }, [debouncedQuery, searchType, performSearch])

  const handleSearchTypeChange = (newType) => {
    setSearchType(newType)
    if (query.trim()) {
      performSearch(query, newType)
    }
  }

  const handleNoteClick = (note) => {
    if (onNoteClick) {
      onNoteClick(note)
    }
    setShowResults(false)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setTotalResults(0)
    setShowResults(false)
    setError(null)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSearchTypeIcon = (type) => {
    switch (type) {
      case 'exact':
        return <Search className="h-3 w-3" />
      case 'fuzzy':
        return <Filter className="h-3 w-3" />
      case 'semantic':
        return <Star className="h-3 w-3" />
      default:
        return <Search className="h-3 w-3" />
    }
  }

  const getSearchTypeColor = (type) => {
    switch (type) {
      case 'exact':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'fuzzy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'semantic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="input pl-10 pr-10 w-full"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Search Type Selector */}
      <div className="flex items-center space-x-2 mt-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">Search type:</span>
        <div className="flex space-x-1">
          {searchTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleSearchTypeChange(type.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                searchType === type.value
                  ? getSearchTypeColor(type.value)
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={type.description}
            >
              <div className="flex items-center space-x-1">
                {getSearchTypeIcon(type.value)}
                <span>{type.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader className="h-5 w-5 animate-spin text-gray-500" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            Searching...
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {showResults && !loading && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-h-96 overflow-y-auto">
          {/* Results Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {totalResults} result{totalResults !== 1 ? 's' : ''}
              </span>
              <div className={`px-2 py-1 text-xs font-medium rounded-full ${getSearchTypeColor(searchType)}`}>
                <div className="flex items-center space-x-1">
                  {getSearchTypeIcon(searchType)}
                  <span>{searchTypes.find(t => t.value === searchType)?.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results List */}
          {results.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleNoteClick(note)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {note.title}
                        </h4>
                        {note.ai_generated && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                            AI
                          </span>
                        )}
                      </div>
                      
                      {/* Search Snippet */}
                      {note.search_snippet && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {note.search_snippet}
                        </p>
                      )}
                      
                      {/* Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{note.library_book?.book?.title || 'Unknown Book'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(note.created_at)}</span>
                        </div>
                        {note.similarity_score && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>{(note.similarity_score * 100).toFixed(1)}% match</span>
                          </div>
                        )}
                        {note.search_rank && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>Rank: {note.search_rank.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No results found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search terms or search type.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NoteSearch
