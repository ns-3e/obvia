import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { filesAPI } from '../utils/api'

const FileUpload = ({ libraryBookId, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file) => {
    // Validate file type
    const fileType = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'epub'].includes(fileType)) {
      setError('Only PDF and EPUB files are supported')
      return
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setError('File size must be less than 50MB')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('library_book', libraryBookId)

      const response = await filesAPI.create(formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      setSuccess('File uploaded successfully!')
      setUploadProgress(100)
      
      if (onUploadComplete) {
        onUploadComplete(response.data)
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      console.error('Upload failed:', error)
      setError(error.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleExtractText = async (fileId) => {
    try {
      setUploading(true)
      setError(null)
      
      await filesAPI.extractText(fileId)
      setSuccess('Text extraction completed!')
      
      if (onUploadComplete) {
        // Refresh the file list
        onUploadComplete()
      }
    } catch (error) {
      console.error('Text extraction failed:', error)
      setError(error.response?.data?.error || 'Text extraction failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-gray-400 bg-gray-50 dark:bg-gray-800'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Upload PDF or EPUB
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Drag and drop a file here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-900 dark:text-gray-100 underline hover:no-underline"
            disabled={uploading}
          >
            browse files
          </button>
        </p>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Maximum file size: 50MB
        </p>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
            <span className="text-gray-900 dark:text-gray-100">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gray-900 dark:bg-gray-100 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-700 dark:text-green-400">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
          >
            <X className="h-4 w-4 text-green-500" />
          </button>
        </div>
      )}
    </div>
  )
}

export default FileUpload
