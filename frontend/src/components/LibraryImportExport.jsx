import { useState, useRef } from 'react'
import { Download, Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { librariesAPI } from '../utils/api'

const LibraryImportExport = ({ libraries, onImportComplete }) => {
  const [importFile, setImportFile] = useState(null)
  const [importProgress, setImportProgress] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [exportProgress, setExportProgress] = useState({})
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleExport = async (library) => {
    try {
      setExportProgress(prev => ({ ...prev, [library.id]: 'exporting' }))
      
      const response = await librariesAPI.export(library.id)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || `${library.name}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      setExportProgress(prev => ({ ...prev, [library.id]: 'completed' }))
      
      // Reset progress after 2 seconds
      setTimeout(() => {
        setExportProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[library.id]
          return newProgress
        })
      }, 2000)
      
    } catch (error) {
      console.error('Export failed:', error)
      setExportProgress(prev => ({ ...prev, [library.id]: 'error' }))
      
      // Reset progress after 3 seconds
      setTimeout(() => {
        setExportProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[library.id]
          return newProgress
        })
      }, 3000)
    }
  }

  const handleFileSelect = (file) => {
    if (file && file.type === 'application/json') {
      setImportFile(file)
      setImportResult(null)
    } else {
      alert('Please select a valid JSON file')
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleImport = async () => {
    if (!importFile) return

    try {
      setImportProgress('uploading')
      setImportResult(null)

      const formData = new FormData()
      formData.append('file', importFile)

      const response = await librariesAPI.import(formData)
      
      setImportProgress('completed')
      setImportResult(response.data)
      
      // Clear file after successful import
      setImportFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Notify parent component
      if (onImportComplete) {
        onImportComplete(response.data)
      }
      
    } catch (error) {
      console.error('Import failed:', error)
      setImportProgress('error')
      
      // Extract detailed error information from the response
      let errorMessage = 'Import failed. Please check the file format and try again.'
      let errorDetails = null
      
      if (error.response?.data) {
        const errorData = error.response.data
        
        // Handle different error response formats
        if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
        
        // Extract additional error details if available
        if (errorData.details) {
          errorDetails = errorData.details
        } else if (errorData.errors) {
          errorDetails = errorData.errors
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setImportResult({
        error: errorMessage,
        details: errorDetails
      })
    }
  }

  const clearImport = () => {
    setImportFile(null)
    setImportProgress(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getProgressIcon = (status) => {
    switch (status) {
      case 'exporting':
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getProgressText = (status) => {
    switch (status) {
      case 'exporting':
        return 'Exporting...'
      case 'uploading':
        return 'Importing...'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Error'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Import & Export Libraries
      </h2>

      {/* Export Section */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Export Libraries
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Export your libraries as JSON files. System libraries cannot be exported.
        </p>
        
        <div className="space-y-3">
          {libraries
            .filter(library => !library.is_system)
            .map((library) => (
              <div key={library.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {library.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {library.library_books_count || 0} books
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {exportProgress[library.id] && (
                    <div className="flex items-center space-x-2 text-sm">
                      {getProgressIcon(exportProgress[library.id])}
                      <span className="text-gray-600 dark:text-gray-400">
                        {getProgressText(exportProgress[library.id])}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleExport(library)}
                    disabled={exportProgress[library.id] === 'exporting'}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            ))}
          
          {libraries.filter(library => !library.is_system).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No libraries available for export
            </p>
          )}
        </div>
      </div>

      {/* Import Section */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Import Library
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Import a library from a JSON file. The file should contain library data exported from this application.
        </p>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          {!importFile ? (
            <div className="space-y-3">
              <Upload className="h-8 w-8 mx-auto text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop a JSON file here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only JSON files are supported
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <FileText className="h-8 w-8 mx-auto text-green-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {importFile.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={clearImport}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Import Progress and Results */}
        {importProgress && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              {getProgressIcon(importProgress)}
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {getProgressText(importProgress)}
              </span>
            </div>
          </div>
        )}

        {importResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            importResult.error 
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-start space-x-3">
              {importResult.error ? (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${
                  importResult.error 
                    ? 'text-red-800 dark:text-red-200' 
                    : 'text-green-800 dark:text-green-200'
                }`}>
                  {importResult.error ? 'Import Failed' : 'Import Successful'}
                </h4>
                <p className={`text-sm mt-1 ${
                  importResult.error 
                    ? 'text-red-700 dark:text-red-300' 
                    : 'text-green-700 dark:text-green-300'
                }`}>
                  {importResult.error || importResult.message}
                </p>
                
                {/* Show detailed error information - only if different from main error */}
                {importResult.error && importResult.details && (() => {
                  let hasAdditionalDetails = false
                  
                  if (typeof importResult.details === 'object') {
                    // Check if there are any unique errors to show
                    const mainErrorLower = importResult.error.toLowerCase()
                    for (const [field, errors] of Object.entries(importResult.details)) {
                      const fieldErrors = Array.isArray(errors) ? errors : [errors]
                      const uniqueErrors = fieldErrors.filter(error => 
                        !mainErrorLower.includes(error.toLowerCase())
                      )
                      if (uniqueErrors.length > 0) {
                        hasAdditionalDetails = true
                        break
                      }
                    }
                  } else {
                    // For non-object details, check if different from main error
                    hasAdditionalDetails = !importResult.error.toLowerCase().includes(importResult.details.toLowerCase())
                  }
                  
                  if (!hasAdditionalDetails) return null
                  
                  return (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        Additional Details:
                      </p>
                      {typeof importResult.details === 'object' ? (
                        <div className="space-y-2">
                          {Object.entries(importResult.details).map(([field, errors]) => {
                            // Skip if the error is already shown in the main message
                            const mainErrorLower = importResult.error.toLowerCase()
                            const fieldErrors = Array.isArray(errors) ? errors : [errors]
                            const uniqueErrors = fieldErrors.filter(error => 
                              !mainErrorLower.includes(error.toLowerCase())
                            )
                            
                            if (uniqueErrors.length === 0) return null
                            
                            return (
                              <div key={field}>
                                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                  {field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')}:
                                </p>
                                <ul className="text-sm text-red-600 dark:text-red-400 ml-4 space-y-1">
                                  {uniqueErrors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                  ))}
                                </ul>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {importResult.details}
                        </p>
                      )}
                    </div>
                  )
                })()}
                
                {!importResult.error && (
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>• Library: {importResult.library_id}</p>
                    <p>• Books imported: {importResult.imported_books}</p>
                    <p>• Books skipped: {importResult.skipped_books}</p>
                  </div>
                )}
                {!importResult.error && importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Warnings:
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>• ... and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Import Button */}
        {importFile && !importProgress && (
          <div className="mt-4">
            <button
              onClick={handleImport}
              className="btn-primary flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import Library</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LibraryImportExport
