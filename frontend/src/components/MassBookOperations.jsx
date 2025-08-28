import { useState, useEffect } from 'react'
import { CheckSquare, Square, ArrowRight, Plus, Minus, Move, AlertCircle, CheckCircle } from 'lucide-react'
import { librariesAPI, booksAPI } from '../utils/api'

const MassBookOperations = ({ libraries, onOperationComplete }) => {
  const [selectedBooks, setSelectedBooks] = useState([])
  const [allBooks, setAllBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [operationType, setOperationType] = useState('add')
  const [sourceLibraryId, setSourceLibraryId] = useState('')
  const [targetLibraryId, setTargetLibraryId] = useState('')
  const [moveToUnassigned, setMoveToUnassigned] = useState(true)
  const [operationProgress, setOperationProgress] = useState(null)
  const [operationResult, setOperationResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAllBooks()
  }, [])

  const loadAllBooks = async () => {
    try {
      setLoading(true)
      const response = await booksAPI.getAll()
      setAllBooks(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load books:', error)
      setError('Failed to load books')
    } finally {
      setLoading(false)
    }
  }

  const handleBookSelection = (bookId) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    )
  }

  const handleSelectAll = () => {
    setSelectedBooks(allBooks.map(book => book.id))
  }

  const handleDeselectAll = () => {
    setSelectedBooks([])
  }

  const handleSelectByLibrary = (libraryId) => {
    const libraryBooks = allBooks.filter(book => 
      book.library_books?.some(lb => lb.library === libraryId)
    )
    setSelectedBooks(libraryBooks.map(book => book.id))
  }

  const performOperation = async () => {
    if (selectedBooks.length === 0) {
      setError('Please select at least one book')
      return
    }

    try {
      setOperationProgress('processing')
      setError('')
      setOperationResult(null)

      let response

      if (operationType === 'add') {
        if (!targetLibraryId) {
          setError('Please select a target library')
          return
        }
        response = await librariesAPI.massAddBooks(targetLibraryId, selectedBooks)
      } else if (operationType === 'remove') {
        if (!sourceLibraryId) {
          setError('Please select a source library')
          return
        }
        response = await librariesAPI.massRemoveBooks(sourceLibraryId, selectedBooks, moveToUnassigned)
      } else if (operationType === 'move') {
        if (!sourceLibraryId || !targetLibraryId) {
          setError('Please select both source and target libraries')
          return
        }
        response = await librariesAPI.massMoveBooks(sourceLibraryId, targetLibraryId, selectedBooks)
      }

      setOperationProgress('completed')
      setOperationResult(response.data)
      setSelectedBooks([])

      if (onOperationComplete) {
        onOperationComplete()
      }
    } catch (error) {
      console.error('Operation failed:', error)
      setOperationProgress('error')
      setError(error.response?.data?.error || 'Operation failed')
    }
  }

  const getOperationButtonText = () => {
    switch (operationType) {
      case 'add':
        return `Add ${selectedBooks.length} Book${selectedBooks.length !== 1 ? 's' : ''} to Library`
      case 'remove':
        return `Remove ${selectedBooks.length} Book${selectedBooks.length !== 1 ? 's' : ''} from Library`
      case 'move':
        return `Move ${selectedBooks.length} Book${selectedBooks.length !== 1 ? 's' : ''} to Library`
      default:
        return 'Perform Operation'
    }
  }

  const getOperationIcon = () => {
    switch (operationType) {
      case 'add':
        return <Plus className="h-4 w-4" />
      case 'remove':
        return <Minus className="h-4 w-4" />
      case 'move':
        return <Move className="h-4 w-4" />
      default:
        return null
    }
  }

  const isBookInLibrary = (book, libraryId) => {
    return book.library_books?.some(lb => lb.library === libraryId)
  }

  const getBookLibraries = (book) => {
    return book.library_books?.map(lb => lb.library_name).join(', ') || 'Unassigned'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Mass Book Operations
        </h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{selectedBooks.length} book{selectedBooks.length !== 1 ? 's' : ''} selected</span>
        </div>
      </div>

      {/* Operation Configuration */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Operation Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Operation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operation Type
            </label>
            <select
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className="input-field w-full"
            >
              <option value="add">Add Books to Library</option>
              <option value="remove">Remove Books from Library</option>
              <option value="move">Move Books Between Libraries</option>
            </select>
          </div>

          {/* Source Library (for remove/move) */}
          {(operationType === 'remove' || operationType === 'move') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Library
              </label>
              <select
                value={sourceLibraryId}
                onChange={(e) => setSourceLibraryId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">Select source library</option>
                {libraries.map(library => (
                  <option key={library.id} value={library.id}>
                    {library.name} ({library.library_books_count || 0} books)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Library (for add/move) */}
          {(operationType === 'add' || operationType === 'move') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Library
              </label>
              <select
                value={targetLibraryId}
                onChange={(e) => setTargetLibraryId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">Select target library</option>
                {libraries
                  .filter(library => !library.is_system || operationType === 'add')
                  .map(library => (
                    <option key={library.id} value={library.id}>
                      {library.name} ({library.library_books_count || 0} books)
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Move to Unassigned option */}
          {operationType === 'remove' && (
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={moveToUnassigned}
                  onChange={(e) => setMoveToUnassigned(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Move books to "Unassigned" library if they're not in other libraries
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Book Selection */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Select Books
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="btn-secondary text-sm"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="btn-secondary text-sm"
            >
              Deselect All
            </button>
            {operationType === 'remove' && sourceLibraryId && (
              <button
                onClick={() => handleSelectByLibrary(sourceLibraryId)}
                className="btn-secondary text-sm"
              >
                Select from Source
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allBooks.map((book) => {
              const isSelected = selectedBooks.includes(book.id)
              const isInSourceLibrary = sourceLibraryId ? isBookInLibrary(book, sourceLibraryId) : true
              
              return (
                <div
                  key={book.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  } ${!isInSourceLibrary ? 'opacity-50' : ''}`}
                >
                  <button
                    onClick={() => handleBookSelection(book.id)}
                    disabled={!isInSourceLibrary}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {book.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {book.authors?.map(author => author.name).join(', ') || 'Unknown Author'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Libraries: {getBookLibraries(book)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Operation Progress */}
      {operationProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-md">
          <div className="flex items-center space-x-2">
            {operationProgress === 'processing' && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
            {operationProgress === 'completed' && (
              <CheckCircle className="h-5 w-5" />
            )}
            {operationProgress === 'error' && (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>
              {operationProgress === 'processing' && 'Processing operation...'}
              {operationProgress === 'completed' && 'Operation completed successfully'}
              {operationProgress === 'error' && 'Operation failed'}
            </span>
          </div>
        </div>
      )}

      {/* Operation Result */}
      {operationResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md">
          <div className="space-y-2">
            <h4 className="font-medium">{operationResult.message}</h4>
            <div className="text-sm space-y-1">
              {operationResult.added_books !== undefined && (
                <p>• Added: {operationResult.added_books} books</p>
              )}
              {operationResult.removed_books !== undefined && (
                <p>• Removed: {operationResult.removed_books} books</p>
              )}
              {operationResult.moved_books !== undefined && (
                <p>• Moved: {operationResult.moved_books} books</p>
              )}
              {operationResult.skipped_books !== undefined && (
                <p>• Skipped: {operationResult.skipped_books} books</p>
              )}
            </div>
            {operationResult.errors && operationResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Warnings:</p>
                <ul className="text-sm space-y-1">
                  {operationResult.errors.slice(0, 3).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {operationResult.errors.length > 3 && (
                    <li>• ... and {operationResult.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={performOperation}
          disabled={selectedBooks.length === 0 || operationProgress === 'processing'}
          className="btn-primary flex items-center space-x-2"
        >
          {getOperationIcon()}
          <span>{getOperationButtonText()}</span>
        </button>
      </div>
    </div>
  )
}

export default MassBookOperations
