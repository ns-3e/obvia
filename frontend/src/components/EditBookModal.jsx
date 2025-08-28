import { useState, useEffect } from 'react'
import { X, Save, Loader, Library, Move } from 'lucide-react'
import { booksAPI, librariesAPI } from '../utils/api'

const EditBookModal = ({ book, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    publisher: '',
    publication_date: '',
    page_count: '',
    language: ''
  })
  const [libraries, setLibraries] = useState([])
  const [selectedLibrary, setSelectedLibrary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (book && isOpen) {
      setFormData({
        title: book.title || '',
        subtitle: book.subtitle || '',
        description: book.description || '',
        publisher: book.publisher || '',
        publication_date: book.publication_date ? book.publication_date.split('T')[0] : '',
        page_count: book.page_count || '',
        language: book.language || ''
      })
      setError(null)
      loadLibraries()
    }
  }, [book, isOpen])

  const loadLibraries = async () => {
    try {
      const response = await librariesAPI.getAll()
      const librariesData = response.data.results || response.data || []
      setLibraries(librariesData)
      
      // Set current library if book has library information
      if (book.library_id) {
        setSelectedLibrary(book.library_id)
      } else if (librariesData.length > 0) {
        setSelectedLibrary(librariesData[0].id)
      }
    } catch (error) {
      console.error('Failed to load libraries:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Clean up the data
      const cleanedData = { ...formData }
      
      // Remove empty strings and convert page_count to number
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') {
          delete cleanedData[key]
        }
      })
      
      if (cleanedData.page_count) {
        cleanedData.page_count = parseInt(cleanedData.page_count, 10)
      }

      // Update book data
      const response = await booksAPI.update(book.id, cleanedData)
      
      // Move book to new library if library changed
      if (selectedLibrary && book.library_id !== selectedLibrary) {
        try {
          await librariesAPI.addBook(selectedLibrary, book.id)
        } catch (moveError) {
          console.error('Failed to move book to new library:', moveError)
          // Don't fail the entire operation if moving fails
        }
      }
      
      if (onSave) {
        onSave(response.data)
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to update book:', error)
      setError(error.response?.data?.message || 'Failed to update book')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-2xl">
              <Library className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Edit Book
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update book details and location
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Library Selection */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Move className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Move to Library
              </label>
            </div>
            <select
              value={selectedLibrary}
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className="input w-full"
            >
              {libraries.map(library => (
                <option key={library.id} value={library.id}>
                  {library.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="input w-full"
                placeholder="Enter book title"
              />
            </div>

            {/* Subtitle */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Enter book subtitle"
              />
            </div>

            {/* Publisher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Publisher
              </label>
              <input
                type="text"
                name="publisher"
                value={formData.publisher}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Publisher name"
              />
            </div>

            {/* Publication Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Publication Date
              </label>
              <input
                type="date"
                name="publication_date"
                value={formData.publication_date}
                onChange={handleInputChange}
                className="input w-full"
              />
            </div>

            {/* Page Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page Count
              </label>
              <input
                type="number"
                name="page_count"
                value={formData.page_count}
                onChange={handleInputChange}
                min="1"
                className="input w-full"
                placeholder="Number of pages"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <input
                type="text"
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Language code (e.g., en, es, fr)"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="input w-full resize-none"
              placeholder="Enter book description"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditBookModal
