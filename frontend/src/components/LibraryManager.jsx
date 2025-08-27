import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Save } from 'lucide-react'
import { librariesAPI } from '../utils/api'
import ConfirmDialog from './ConfirmDialog'

const LibraryManager = ({ onLibraryChange }) => {
  const [libraries, setLibraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLibrary, setEditingLibrary] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [error, setError] = useState('')
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, library: null })

  useEffect(() => {
    loadLibraries()
  }, [])

  const loadLibraries = async () => {
    try {
      setLoading(true)
      const response = await librariesAPI.getAll()
      setLibraries(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load libraries:', error)
      setError('Failed to load libraries')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Library name is required')
      return
    }

    try {
      if (editingLibrary) {
        await librariesAPI.update(editingLibrary.id, formData)
      } else {
        await librariesAPI.create(formData)
      }
      
      setFormData({ name: '', description: '' })
      setShowAddForm(false)
      setEditingLibrary(null)
      await loadLibraries()
      if (onLibraryChange) onLibraryChange()
    } catch (error) {
      console.error('Failed to save library:', error)
      setError(error.response?.data?.error || 'Failed to save library')
    }
  }

  const handleEdit = (library) => {
    setEditingLibrary(library)
    setFormData({ name: library.name, description: library.description || '' })
    setShowAddForm(true)
  }

  const handleDelete = async (library) => {
    setDeleteDialog({ isOpen: true, library })
  }

  const confirmDelete = async () => {
    try {
      await librariesAPI.delete(deleteDialog.library.id)
      await loadLibraries()
      if (onLibraryChange) onLibraryChange()
      setDeleteDialog({ isOpen: false, library: null })
    } catch (error) {
      console.error('Failed to delete library:', error)
      setError(error.response?.data?.error || 'Failed to delete library')
      setDeleteDialog({ isOpen: false, library: null })
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', description: '' })
    setShowAddForm(false)
    setEditingLibrary(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Manage Libraries
        </h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Library</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {editingLibrary ? 'Edit Library' : 'Add New Library'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Library Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field w-full"
                placeholder="Enter library name"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field w-full"
                rows="3"
                placeholder="Enter library description (optional)"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{editingLibrary ? 'Update Library' : 'Create Library'}</span>
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {libraries.map((library) => (
          <div key={library.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {library.name}
                </h3>
                {library.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {library.description}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {library.library_books_count || 0} books
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(library)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title="Edit library"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {library.name !== 'Unassigned' && (
                  <button
                    onClick={() => handleDelete(library)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    title="Delete library"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, library: null })}
        onConfirm={confirmDelete}
        title="Delete Library"
        message={`Are you sure you want to delete "${deleteDialog.library?.name}"? Books in this library will be moved to the "Unassigned" library if they're not in other libraries.`}
        confirmText="Delete Library"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}

export default LibraryManager
