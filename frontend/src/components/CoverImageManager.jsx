import { useState, useEffect } from 'react'
import { Search, Image, Download, X, Loader, RefreshCw } from 'lucide-react'
import { booksAPI } from '../utils/api'

const CoverImageManager = ({ book, onCoverChange }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSearch, setShowSearch] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await booksAPI.searchCovers({
        title: book.title,
        author: book.authors?.[0]?.name || '',
        isbn: book.primary_isbn_13 || book.isbn_10
      })

      setSearchResults(response.data.covers || [])
    } catch (error) {
      console.error('Cover search failed:', error)
      setError('Failed to search for cover images. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCover = async (coverUrl) => {
    try {
      setLoading(true)
      
      // Update the book with the new cover URL
      await booksAPI.update(book.id, { cover_url: coverUrl })
      
      // Notify parent component
      if (onCoverChange) {
        onCoverChange(coverUrl)
      }
      
      setShowSearch(false)
      setSearchResults([])
      setSearchQuery('')
    } catch (error) {
      console.error('Failed to update cover:', error)
      setError('Failed to update cover image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCover = async () => {
    try {
      setLoading(true)
      
      // Remove the cover URL
      await booksAPI.update(book.id, { cover_url: null })
      
      // Notify parent component
      if (onCoverChange) {
        onCoverChange(null)
      }
    } catch (error) {
      console.error('Failed to remove cover:', error)
      setError('Failed to remove cover image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const autoSearch = async () => {
    if (!book.title) return
    
    setLoading(true)
    setError(null)

    try {
      const response = await booksAPI.searchCovers({
        title: book.title,
        author: book.authors?.[0]?.name || '',
        isbn: book.primary_isbn_13 || book.isbn_10
      })

      setSearchResults(response.data.covers || [])
      setShowSearch(true)
    } catch (error) {
      console.error('Auto cover search failed:', error)
      setError('Failed to search for cover images automatically.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Cover Display */}
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {book.cover_url ? (
            <div className="relative group">
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-32 h-40 object-cover rounded-2xl shadow-soft"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-2xl flex items-center justify-center">
                <button
                  onClick={handleRemoveCover}
                  disabled={loading}
                  className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200"
                  title="Remove cover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-32 h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
              <Image className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Cover Image
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {book.cover_url 
              ? 'Click the X button to remove the current cover image.'
              : 'No cover image available. Search for one below.'
            }
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={autoSearch}
              disabled={loading}
              className="btn-secondary flex items-center space-x-2"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Auto Search</span>
            </button>
            
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="btn-outline flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Manual Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Search Interface */}
      {showSearch && (
        <div className="card p-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Search for Cover Images
              </h4>
              <form onSubmit={handleSearch} className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, author, or ISBN..."
                  className="input flex-1"
                />
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>Search</span>
                </button>
              </form>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Found {searchResults.length} cover images:
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.map((cover, index) => (
                    <div
                      key={index}
                      className="group relative cursor-pointer rounded-2xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all duration-200"
                    >
                      <img
                        src={cover.url}
                        alt={`Cover ${index + 1}`}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => handleSelectCover(cover.url)}
                          disabled={loading}
                          className="opacity-0 group-hover:opacity-100 btn-primary flex items-center space-x-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Select</span>
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2">
                        <div className="font-medium">{cover.source}</div>
                        {cover.title && <div className="truncate">{cover.title}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.length === 0 && !loading && searchQuery && (
              <div className="text-center py-8">
                <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  No cover images found. Try a different search term.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CoverImageManager
