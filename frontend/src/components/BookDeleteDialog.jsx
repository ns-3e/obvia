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
  const [action, setAction] = useState('remove') // 'remove' or 'delete'
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
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Delete Book
                </h3>
                
                {/* Action Selection */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="remove"
                      name="action"
                      value="remove"
                      checked={action === 'remove'}
                      onChange={(e) => setAction(e.target.value)}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
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
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <label htmlFor="delete" className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Forever</span>
                    </label>
                  </div>
                </div>

                {/* Action Description */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <ActionIcon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {actionInfo.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {actionInfo.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${actionInfo.buttonClass}`}
              onClick={handleAction}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                actionInfo.buttonText
              )}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDeleteDialog
