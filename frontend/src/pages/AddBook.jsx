import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Search, ArrowLeft, BookOpen, AlertCircle } from 'lucide-react'
import { booksAPI, librariesAPI } from '../utils/api'
import BarcodeScanner from '../components/BarcodeScanner'

const AddBook = () => {
  const [isbn, setIsbn] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bookData, setBookData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedLibrary, setSelectedLibrary] = useState('')
  const [libraries, setLibraries] = useState([])
  const navigate = useNavigate()

  // Load libraries on component mount
  useEffect(() => {
    loadLibraries()
  }, [])

  const loadLibraries = async () => {
    try {
      const response = await librariesAPI.getAll()
      setLibraries(response.data.results || response.data)
      if (response.data.results?.length > 0) {
        setSelectedLibrary(response.data.results[0].id)
      }
    } catch (error) {
      console.error('Failed to load libraries:', error)
    }
  }

  const handleScan = (scannedIsbn) => {
    setIsbn(scannedIsbn)
    setShowScanner(false)
    // Automatically lookup the book after scanning
    lookupBook(scannedIsbn)
  }

  const handleLookup = async (e) => {
    e.preventDefault()
    if (isbn.trim()) {
      lookupBook(isbn.trim())
    }
  }

  const lookupBook = async (isbn) => {
    try {
      setLoading(true)
      setError(null)
      setBookData(null)

      const response = await booksAPI.lookup(isbn)
      setBookData(response.data)
    } catch (error) {
      console.error('Book lookup failed:', error)
      setError('Book not found. Please check the ISBN and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleIngest = async () => {
    if (!selectedLibrary) {
      setError('Please select a library')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Ingest the book
      const bookResponse = await booksAPI.ingest(isbn)
      const book = bookResponse.data

      // Add to selected library
      await librariesAPI.addBook(selectedLibrary, book.id)

      // Navigate to the library
      navigate(`/libraries/${selectedLibrary}`)
    } catch (error) {
      console.error('Failed to add book:', error)
      setError('Failed to add book to library. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Add Book
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add a book to your library using ISBN
          </p>
        </div>
      </div>

      {/* ISBN Input */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Enter ISBN
        </h2>
        
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="Enter ISBN (10 or 13 digits)"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="input flex-1"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!isbn.trim() || loading}
              className="btn-primary"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="btn-secondary"
              disabled={loading}
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="text-gray-600 dark:text-gray-400">Looking up book...</p>
          </div>
        </div>
      )}

      {/* Book Data */}
      {bookData && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Book Found
          </h2>
          
          <div className="flex space-x-4">
            {/* Cover */}
            <div className="flex-shrink-0">
              {bookData.cover_url ? (
                <img
                  src={bookData.cover_url}
                  alt={bookData.title}
                  className="w-24 h-32 object-cover rounded-2xl shadow-soft"
                />
              ) : (
                <div className="w-24 h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1">
                {bookData.title}
              </h3>
              
              {bookData.subtitle && (
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {bookData.subtitle}
                </p>
              )}
              
              {bookData.authors && bookData.authors.length > 0 && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  by {bookData.authors.join(', ')}
                </p>
              )}
              
              {bookData.publisher && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {bookData.publisher}
                </p>
              )}
              
              {bookData.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                  {bookData.description}
                </p>
              )}
            </div>
          </div>

          {/* Library Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add to Library
            </label>
            <select
              value={selectedLibrary}
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className="input"
            >
              {libraries.map((library) => (
                <option key={library.id} value={library.id}>
                  {library.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleIngest}
              disabled={loading || !selectedLibrary}
              className="btn-primary flex-1"
            >
              {loading ? 'Adding...' : 'Add to Library'}
            </button>
            <button
              onClick={() => {
                setBookData(null)
                setIsbn('')
                setError(null)
              }}
              className="btn-outline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

export default AddBook
