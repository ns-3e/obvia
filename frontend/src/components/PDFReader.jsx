import { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, 
  Download, X, Highlighter, BookOpen, Settings 
} from 'lucide-react'
import { pdfHighlightsAPI } from '../utils/api'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

const PDFReader = ({ 
  fileUrl, 
  fileName, 
  onClose, 
  onHighlight = null,
  bookFileId = null,
  className = '' 
}) => {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [highlights, setHighlights] = useState([])
  const [isHighlighting, setIsHighlighting] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState(null)
  
  const canvasRef = useRef(null)
  const documentRef = useRef(null)

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    console.log('PDF loaded successfully:', { numPages, fileUrl })
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      setLoadTimeout(null)
    }
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [fileUrl, loadTimeout])

  const onDocumentLoadError = useCallback((error) => {
    console.error('PDF load error:', error)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      setLoadTimeout(null)
    }
    setError(`Failed to load PDF: ${error.message}`)
    setLoading(false)
  }, [loadTimeout])

  const changePage = useCallback((offset) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset
      return Math.min(Math.max(1, newPageNumber), numPages)
    })
  }, [numPages])

  const changeScale = useCallback((newScale) => {
    setScale(prevScale => {
      const scale = prevScale + newScale
      return Math.min(Math.max(0.5, scale), 3.0)
    })
  }, [])

  const rotate = useCallback(() => {
    setRotation(prevRotation => (prevRotation + 90) % 360)
  }, [])

  const handleTextSelection = useCallback(async () => {
    const selection = window.getSelection()
    const text = selection.toString().trim()
    
    if (text && isHighlighting) {
      setSelectedText(text)
      
      // Get selection coordinates
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      // Create highlight object
      const highlightData = {
        book_file: bookFileId,
        text,
        page: pageNumber,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        color: '#ffeb3b'
      }
      
      try {
        // Save highlight to backend
        if (bookFileId) {
          const response = await pdfHighlightsAPI.create(highlightData)
          const savedHighlight = response.data
          
          setHighlights(prev => [...prev, savedHighlight])
          
          // Call parent callback if provided
          if (onHighlight) {
            onHighlight(savedHighlight)
          }
        } else {
          // Fallback for local highlights when no bookFileId
          const localHighlight = {
            id: Date.now(),
            ...highlightData,
            timestamp: new Date().toISOString()
          }
          
          setHighlights(prev => [...prev, localHighlight])
          
          if (onHighlight) {
            onHighlight(localHighlight)
          }
        }
      } catch (error) {
        console.error('Failed to save highlight:', error)
        // Still add to local state even if backend save fails
        const localHighlight = {
          id: Date.now(),
          ...highlightData,
          timestamp: new Date().toISOString()
        }
        setHighlights(prev => [...prev, localHighlight])
      }
      
      // Clear selection
      selection.removeAllRanges()
      setIsHighlighting(false)
    }
  }, [isHighlighting, pageNumber, onHighlight, bookFileId])

  const removeHighlight = useCallback((highlightId) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId))
  }, [])

  const downloadPDF = useCallback(() => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName || 'document.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [fileUrl, fileName])

  // Handle text selection
  useEffect(() => {
    if (isHighlighting) {
      document.addEventListener('mouseup', handleTextSelection)
      return () => document.removeEventListener('mouseup', handleTextSelection)
    }
  }, [isHighlighting, handleTextSelection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          changePage(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          changePage(1)
          break
        case '=':
        case '+':
          e.preventDefault()
          changeScale(0.1)
          break
        case '-':
          e.preventDefault()
          changeScale(-0.1)
          break
        case 'r':
          e.preventDefault()
          rotate()
          break
        case 'h':
          e.preventDefault()
          setIsHighlighting(!isHighlighting)
          break
        case 'Escape':
          e.preventDefault()
          setIsHighlighting(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [changePage, changeScale, rotate, isHighlighting])

  // Load existing highlights when component mounts
  useEffect(() => {
    const loadHighlights = async () => {
      if (bookFileId) {
        try {
          const response = await pdfHighlightsAPI.getByBookFile(bookFileId)
          setHighlights(response.data.results || response.data || [])
        } catch (error) {
          console.error('Failed to load highlights:', error)
        }
      }
    }
    
    loadHighlights()
  }, [bookFileId])

  // Set up loading timeout
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.error('PDF loading timeout after 30 seconds')
        setError('PDF loading timeout. Please try again.')
        setLoading(false)
      }, 30000) // 30 seconds timeout
      
      setLoadTimeout(timeout)
      
      return () => {
        if (timeout) {
          clearTimeout(timeout)
        }
      }
    }
  }, [loading])

  if (loading) {
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center max-w-md">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Failed to load PDF
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-5 w-5 text-gray-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {fileName || 'PDF Document'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {pageNumber} of {numPages}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Highlight toggle */}
            <button
              onClick={() => setIsHighlighting(!isHighlighting)}
              className={`p-2 rounded-lg transition-colors ${
                isHighlighting 
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Toggle highlighting (H)"
            >
              <Highlighter className="h-5 w-5" />
            </button>
            
            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            
            {/* Download */}
            <button
              onClick={downloadPDF}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
              title="Download PDF"
            >
              <Download className="h-5 w-5" />
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Zoom:</span>
                <button
                  onClick={() => changeScale(-0.1)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Zoom out (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => changeScale(0.1)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Zoom in (=)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
              
              <button
                onClick={rotate}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Rotate (R)"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Highlights:</span>
                <span className="text-sm font-medium">{highlights.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* PDF Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-center">
            <div className="relative">
              <Document
                ref={documentRef}
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  canvasRef={canvasRef}
                  className="shadow-lg"
                />
                
                {/* Render existing highlights for current page */}
                {highlights
                  .filter(highlight => highlight.page === pageNumber)
                  .map(highlight => (
                    <div
                      key={highlight.id}
                      className="pdf-highlight-overlay"
                      style={{
                        left: highlight.x,
                        top: highlight.y,
                        width: highlight.width,
                        height: highlight.height,
                        backgroundColor: highlight.color + '40', // Add transparency
                        borderColor: highlight.color
                      }}
                      title={highlight.text}
                    />
                  ))}
              </Document>
              
              {/* Highlighting overlay */}
              {isHighlighting && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-yellow-200 bg-opacity-20 border-2 border-yellow-400 border-dashed"></div>
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs">
                    Select text to highlight
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Previous page (←)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {pageNumber} / {numPages}
            </span>
            
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Next page (→)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isHighlighting ? 'Highlight mode active (H to toggle)' : 'Press H to highlight text'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PDFReader
