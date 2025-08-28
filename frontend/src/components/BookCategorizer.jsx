import { useState, useEffect } from 'react'
import { Brain, Tag, Plus, X, Loader, Sparkles } from 'lucide-react'
import { booksAPI, tagsAPI } from '../utils/api'

const BookCategorizer = ({ book, libraryBookId, onTagsChange }) => {
  const [suggestedCategories, setSuggestedCategories] = useState([])
  const [currentTags, setCurrentTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (libraryBookId) {
      loadCurrentTags()
    }
  }, [libraryBookId])

  const loadCurrentTags = async () => {
    try {
      // This would typically come from the library book's tags
      // For now, we'll use a placeholder
      setCurrentTags([])
    } catch (error) {
      console.error('Failed to load current tags:', error)
    }
  }

  const analyzeBook = async () => {
    if (!book) return

    setLoading(true)
    setError(null)

    try {
      const response = await booksAPI.categorize({
        book_id: book.id,
        title: book.title,
        description: book.description,
        authors: book.authors?.map(author => author.name) || []
      })

      setSuggestedCategories(response.data.categories || [])
      setConfidence(response.data.confidence || 0)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Book categorization failed:', error)
      setError('Failed to analyze book content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async (category) => {
    try {
      setLoading(true)
      
      // Create tag if it doesn't exist
      let tag
      try {
        const tagResponse = await tagsAPI.create({ name: category })
        tag = tagResponse.data
      } catch (tagError) {
        // Tag might already exist, try to get it
        const tagsResponse = await tagsAPI.getAll({ name: category })
        if (tagsResponse.data.results && tagsResponse.data.results.length > 0) {
          tag = tagsResponse.data.results[0]
        } else {
          throw tagError
        }
      }

      // Add tag to library book
      // This would typically be done through the library books API
      // For now, we'll just update the local state
      setCurrentTags(prev => [...prev, tag])
      
      // Remove from suggestions
      setSuggestedCategories(prev => prev.filter(cat => cat !== category))
      
      if (onTagsChange) {
        onTagsChange([...currentTags, tag])
      }
    } catch (error) {
      console.error('Failed to add category:', error)
      setError('Failed to add category. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const removeTag = async (tagId) => {
    try {
      setLoading(true)
      
      // Remove tag from library book
      // This would typically be done through the library books API
      setCurrentTags(prev => prev.filter(tag => tag.id !== tagId))
      
      if (onTagsChange) {
        onTagsChange(currentTags.filter(tag => tag.id !== tagId))
      }
    } catch (error) {
      console.error('Failed to remove tag:', error)
      setError('Failed to remove tag. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (conf) => {
    if (conf >= 0.8) return 'text-green-600 dark:text-green-400'
    if (conf >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceLabel = (conf) => {
    if (conf >= 0.8) return 'High'
    if (conf >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AI Categorization
          </h3>
        </div>
        <button
          onClick={analyzeBook}
          disabled={loading || !book}
          className="btn-secondary flex items-center space-x-2"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>Analyze Book</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Current Tags */}
      {currentTags.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Current Categories
          </h4>
          <div className="flex flex-wrap gap-2">
            {currentTags.map((tag) => (
              <span
                key={tag.id}
                className="badge-primary flex items-center space-x-2"
              >
                <Tag className="h-3 w-3" />
                <span>{tag.name}</span>
                <button
                  onClick={() => removeTag(tag.id)}
                  disabled={loading}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Categories */}
      {showSuggestions && suggestedCategories.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Suggested Categories
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Confidence:
              </span>
              <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {suggestedCategories.map((category) => (
              <button
                key={category}
                onClick={() => addCategory(category)}
                disabled={loading}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {category}
                  </span>
                </div>
                <Plus className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <Sparkles className="h-4 w-4 inline mr-1" />
              AI analysis based on book title, description, and author information.
              Click on any category to add it to your book.
            </p>
          </div>
        </div>
      )}

      {/* No Suggestions */}
      {showSuggestions && suggestedCategories.length === 0 && !loading && (
        <div className="card p-6 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Categories Found
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            The AI couldn't determine specific categories for this book.
            You can manually add tags using the tag management feature.
          </p>
        </div>
      )}

      {/* Instructions */}
      {!showSuggestions && currentTags.length === 0 && (
        <div className="card p-4">
          <div className="flex items-start space-x-3">
            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Automatic Book Categorization
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use AI to automatically analyze your book and suggest relevant categories.
                The system examines the title, description, and author information to identify
                genres, topics, and themes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookCategorizer
