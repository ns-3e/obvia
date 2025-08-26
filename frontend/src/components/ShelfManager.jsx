import { useState, useEffect } from 'react'
import { BookOpen, Plus, X, Edit, Trash2, Loader } from 'lucide-react'
import { shelvesAPI } from '../utils/api'

const ShelfManager = ({ libraryBookId, onShelfChange }) => {
  const [systemShelves, setSystemShelves] = useState([])
  const [customShelves, setCustomShelves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateShelf, setShowCreateShelf] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const [newShelfDescription, setNewShelfDescription] = useState('')
  const [bookShelves, setBookShelves] = useState([])

  useEffect(() => {
    loadShelves()
  }, [])

  useEffect(() => {
    if (libraryBookId) {
      loadBookShelves()
    }
  }, [libraryBookId])

  const loadShelves = async () => {
    try {
      setLoading(true)
      const [systemResponse, customResponse] = await Promise.all([
        shelvesAPI.getSystemShelves(),
        shelvesAPI.getCustomShelves()
      ])
      
      setSystemShelves(systemResponse.data)
      setCustomShelves(customResponse.data)
    } catch (error) {
      console.error('Failed to load shelves:', error)
      setError('Failed to load shelves')
    } finally {
      setLoading(false)
    }
  }

  const loadBookShelves = async () => {
    try {
      // Get all shelves and check which ones contain this book
      const allShelves = [...systemShelves, ...customShelves]
      const bookShelvesList = []
      
      for (const shelf of allShelves) {
        try {
          const response = await shelvesAPI.getShelfBooks(shelf.id)
          const hasBook = response.data.some(book => book.id === libraryBookId)
          if (hasBook) {
            bookShelvesList.push(shelf)
          }
        } catch (error) {
          console.error(`Failed to check shelf ${shelf.id}:`, error)
        }
      }
      
      setBookShelves(bookShelvesList)
    } catch (error) {
      console.error('Failed to load book shelves:', error)
    }
  }

  const handleAddToShelf = async (shelfId) => {
    try {
      setError(null)
      await shelvesAPI.addBookToShelf(shelfId, { library_book_id: libraryBookId })
      await loadBookShelves()
      if (onShelfChange) {
        onShelfChange()
      }
    } catch (error) {
      console.error('Failed to add book to shelf:', error)
      setError('Failed to add book to shelf')
    }
  }

  const handleRemoveFromShelf = async (shelfId) => {
    try {
      setError(null)
      await shelvesAPI.removeBookFromShelf(shelfId, { library_book_id: libraryBookId })
      await loadBookShelves()
      if (onShelfChange) {
        onShelfChange()
      }
    } catch (error) {
      console.error('Failed to remove book from shelf:', error)
      setError('Failed to remove book from shelf')
    }
  }

  const handleCreateShelf = async () => {
    if (!newShelfName.trim()) {
      setError('Shelf name is required')
      return
    }

    try {
      setError(null)
      await shelvesAPI.create({
        name: newShelfName.trim(),
        description: newShelfDescription.trim(),
        is_system: false
      })
      
      setNewShelfName('')
      setNewShelfDescription('')
      setShowCreateShelf(false)
      
      await loadShelves()
    } catch (error) {
      console.error('Failed to create shelf:', error)
      setError('Failed to create shelf')
    }
  }

  const handleDeleteShelf = async (shelfId) => {
    if (!confirm('Are you sure you want to delete this shelf? This action cannot be undone.')) {
      return
    }

    try {
      setError(null)
      await shelvesAPI.delete(shelfId)
      await loadShelves()
      await loadBookShelves()
      if (onShelfChange) {
        onShelfChange()
      }
    } catch (error) {
      console.error('Failed to delete shelf:', error)
      setError('Failed to delete shelf')
    }
  }

  const isBookOnShelf = (shelfId) => {
    return bookShelves.some(shelf => shelf.id === shelfId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Shelves
        </h3>
        <button
          onClick={() => setShowCreateShelf(!showCreateShelf)}
          className="btn-secondary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Shelf</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Create Shelf Form */}
      {showCreateShelf && (
        <div className="card p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Create New Shelf
              </h4>
              <button
                onClick={() => setShowCreateShelf(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shelf Name
                </label>
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="e.g., Philosophy, Science Fiction..."
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newShelfDescription}
                  onChange={(e) => setNewShelfDescription(e.target.value)}
                  placeholder="Brief description of this shelf..."
                  className="input h-20 resize-none"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCreateShelf}
                className="btn-primary"
              >
                Create Shelf
              </button>
              <button
                onClick={() => setShowCreateShelf(false)}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Shelves */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          System Shelves
        </h4>
        
        {systemShelves.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No system shelves found
          </div>
        ) : (
          systemShelves.map((shelf) => (
            <div key={shelf.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {shelf.name}
                    </h5>
                    {isBookOnShelf(shelf.id) && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                        Added
                      </span>
                    )}
                  </div>
                  {shelf.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shelf.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {isBookOnShelf(shelf.id) ? (
                    <button
                      onClick={() => handleRemoveFromShelf(shelf.id)}
                      className="btn-outline text-sm"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddToShelf(shelf.id)}
                      className="btn-primary text-sm"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Custom Shelves */}
      {customShelves.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Custom Shelves
          </h4>
          
          {customShelves.map((shelf) => (
            <div key={shelf.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {shelf.name}
                    </h5>
                    {isBookOnShelf(shelf.id) && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                        Added
                      </span>
                    )}
                  </div>
                  {shelf.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shelf.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {isBookOnShelf(shelf.id) ? (
                    <button
                      onClick={() => handleRemoveFromShelf(shelf.id)}
                      className="btn-outline text-sm"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddToShelf(shelf.id)}
                      className="btn-primary text-sm"
                    >
                      Add
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteShelf(shelf.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {systemShelves.length === 0 && customShelves.length === 0 && (
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No shelves yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first shelf to organize your books.
          </p>
          <button
            onClick={() => setShowCreateShelf(true)}
            className="btn-primary"
          >
            Create Shelf
          </button>
        </div>
      )}
    </div>
  )
}

export default ShelfManager
