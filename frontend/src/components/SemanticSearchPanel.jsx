import { useState, useEffect } from 'react'
import { Search, Brain, AlertCircle, Loader, Sparkles } from 'lucide-react'
import { searchAPI } from '../utils/api'

const SemanticSearchPanel = ({ libraryId, onResultClick }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    checkSemanticSearchStatus()
  }, [])

  const checkSemanticSearchStatus = async () => {
    try {
      const response = await searchAPI.status()
      setStatus(response.data)
      setIsEnabled(response.data.enabled)
    } catch (error) {
      console.error('Failed to check semantic search status:', error)
      setIsEnabled(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim() || !isEnabled) return

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await searchAPI.semantic({
        query: query.trim(),
        library_id: libraryId,
        top_k: 10
      })

      setResults(response.data.results || [])
    } catch (error) {
      console.error('Semantic search failed:', error)
      if (error.response?.status === 503) {
        setError('Semantic search is not enabled. Please configure AI_PROVIDER in your environment.')
      } else {
        setError(error.response?.data?.error || 'Semantic search failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'book':
        return '📚'
      case 'note':
        return '📝'
      case 'review':
        return '⭐'
      case 'file_text':
        return '📄'
      default:
        return '📄'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'book':
        return 'Book'
      case 'note':
        return 'Note'
      case 'review':
        return 'Review'
      case 'file_text':
        return 'File Text'
      default:
        return type
    }
  }

  if (!isEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Semantic Search
          </h3>
        </div>
        
        <div className="card p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Semantic Search Not Available
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            To enable semantic search, set the AI_PROVIDER environment variable to 'openai' or 'local'.
          </p>
          {status && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Current provider: {status.provider || 'disabled'}</p>
              {status.model && <p>Model: {status.model}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Brain className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Semantic Search
        </h3>
        {status?.provider && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
            {status.provider}
          </span>
        )}
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for concepts, ideas, or topics..."
            className="input pl-10 pr-4"
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Search Semantically</span>
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Search Results ({results.length})
          </h4>
          
          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="card p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => onResultClick && onResultClick(result)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-2xl">
                    {getTypeIcon(result.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.title}
                      </h5>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                        {getTypeLabel(result.type)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Score: {result.score}
                      </span>
                    </div>
                    
                    {result.snippet && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {result.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && results.length === 0 && query && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No semantic matches found
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Try different keywords or concepts to find related content.
          </p>
        </div>
      )}
    </div>
  )
}

export default SemanticSearchPanel
