import { useState } from 'react'
import { X, AlertTriangle, Trash2, Archive } from 'lucide-react'

const BookDeleteDialog = ({ 
  isOpen, 
  onClose, 
  onRemoveFromLibrary, 
  onDeleteForever, 
  bookTitle, 
  libraryName 
}) => {
  // Check if book is already in "Unassigned" library
  const isInUnassignedLibrary = libraryName === 'Unassigned'
  
  // Default to 'delete' if in Unassigned library, otherwise 'remove'
  const [action, setAction] = useState(isInUnassignedLibrary ? 'delete' : 'remove')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleAction = async () => {
    setLoading(true)
    try {
      if (action === 'remove') {
        await onRemoveFromLibrary()
      } else {
        await onDeleteForever()
      }
    } finally {
      setLoading(false)
    }
  }

  const getActionDescription = () => {
    if (action === 'remove') {
      return {
        title: 'Remove from Library',
        description: `Remove "${bookTitle}" from "${libraryName}". If the book is not in other libraries, it will be moved to the "Unassigned" library.`,
        icon: Archive,
        buttonClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        buttonText: 'Remove from Library'
      }
    } else {
      return {
        title: 'Delete Forever',
        description: `Permanently delete "${bookTitle}" from the entire application. This action cannot be undone and will remove all associated notes, ratings, and files.`,
        icon: Trash2,
        buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        buttonText: 'Delete Forever'
      }
    }
  }

  const actionInfo = getActionDescription()
  const ActionIcon = actionInfo.icon

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Delete Book
                </h3>
                
                {/* Action Selection - Only show if not in Unassigned library */}
                {!isInUnassignedLibrary && (
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="remove"
                        name="action"
                        value="remove"
                        checked={action === 'remove'}
                        onChange={(e) => setAction(e.target.value)}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 dark:border-gray-600"
                      />
                      <label htmlFor="remove" className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Archive className="h-4 w-4" />
                        <span>Remove from Library</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="delete"
                        name="action"
                        value="delete"
                        checked={action === 'delete'}
                        onChange={(e) => setAction(e.target.value)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600"
                      />
                      <label htmlFor="delete" className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Forever</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Action Description */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <ActionIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {actionInfo.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {actionInfo.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
            <button
              type="button"
              className="btn-outline mt-3 sm:mt-0"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn-primary ${actionInfo.buttonClass}`}
              onClick={handleAction}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                actionInfo.buttonText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDeleteDialog
