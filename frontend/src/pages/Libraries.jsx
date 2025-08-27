import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import LibraryManager from '../components/LibraryManager'

const Libraries = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleLibraryChange = () => {
    // Trigger a refresh of the library list
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Library Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create, edit, and organize your libraries
            </p>
          </div>
        </div>
      </div>

      {/* Library Manager */}
      <LibraryManager 
        key={refreshTrigger}
        onLibraryChange={handleLibraryChange} 
      />

      {/* Info Section */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
          About Library Management
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            • Libraries help you organize your books into logical collections
          </p>
          <p>
            • When you delete a library, books that aren't in other libraries will be moved to the "Unassigned" library
          </p>
          <p>
            • System libraries (marked with "System" badge) cannot be deleted and serve as default locations
          </p>
          <p>
            • You can edit library names and descriptions at any time
          </p>
        </div>
      </div>
    </div>
  )
}

export default Libraries
