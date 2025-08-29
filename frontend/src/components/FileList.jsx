import { useState, useEffect } from 'react'
import { FileText, Download, Trash2, File, CheckCircle, AlertCircle, Loader, BookOpen } from 'lucide-react'
import { filesAPI } from '../utils/api'
import PDFReader from './PDFReader'

const FileList = ({ libraryBookId }) => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPDF, setSelectedPDF] = useState(null)
  const [highlights, setHighlights] = useState([])

  useEffect(() => {
    loadFiles()
  }, [libraryBookId])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const response = await filesAPI.getByLibraryBook(libraryBookId)
      setFiles(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load files:', error)
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      await filesAPI.delete(fileId)
      setFiles(files.filter(file => file.id !== fileId))
    } catch (error) {
      console.error('Failed to delete file:', error)
      setError('Failed to delete file')
    }
  }

  const handleExtractText = async (fileId) => {
    try {
      await filesAPI.extractText(fileId)
      // Reload files to get updated status
      await loadFiles()
    } catch (error) {
      console.error('Failed to extract text:', error)
      setError('Failed to extract text')
    }
  }

  const handleReadPDF = (file) => {
    // Construct the PDF URL - this will need to be adjusted based on your backend setup
    const baseUrl = 'http://localhost:8000' // Use explicit localhost for now
    const pdfUrl = `${baseUrl}/media/${file.file_path}`
    setSelectedPDF({
      url: pdfUrl,
      name: file.filename || file.file_path.split('/').pop(),
      bookFileId: file.id
    })
  }

  const handleHighlight = (highlight) => {
    setHighlights(prev => [...prev, highlight])
    console.log('New highlight:', highlight)
  }

  const handleClosePDF = () => {
    setSelectedPDF(null)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No files uploaded
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a PDF or EPUB file to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Uploaded Files ({files.length})
      </h3>
      
      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="card p-4 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {file.file_type === 'pdf' ? (
                  <FileText className="h-8 w-8 text-red-500" />
                ) : (
                  <File className="h-8 w-8 text-blue-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.file_path.split('/').pop()}
                </h4>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(file.bytes)}</span>
                  <span>{file.file_type.toUpperCase()}</span>
                  <span>Uploaded {formatDate(file.uploaded_at)}</span>
                </div>
                
                {/* Text extraction status */}
                {file.file_type === 'pdf' && (
                  <div className="flex items-center space-x-2 mt-2">
                    {file.text_extracted ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          Text extracted ({file.extracted_text?.length || 0} characters)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">
                          Text not extracted
                        </span>
                        <button
                          onClick={() => handleExtractText(file.id)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Extract text
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {file.file_type === 'pdf' && (
                <button
                  onClick={() => handleReadPDF(file)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors"
                  title="Read PDF"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(file.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                title="Delete file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PDF Reader Modal */}
      {selectedPDF && (
        <PDFReader
          fileUrl={selectedPDF.url}
          fileName={selectedPDF.name}
          bookFileId={selectedPDF.bookFileId}
          onClose={handleClosePDF}
          onHighlight={handleHighlight}
        />
      )}
    </div>
  )
}

export default FileList
