import { useState, useEffect } from 'react'
import { X, Save, Loader } from 'lucide-react'
import { booksAPI } from '../utils/api'

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
    }
  }, [book, isOpen])

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

      const response = await booksAPI.update(book.id, cleanedData)
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Edit Book
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="Book title"
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
                placeholder="Book subtitle"
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
              placeholder="Book description"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
