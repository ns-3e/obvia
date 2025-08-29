import { useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { Edit, Download, Eye, EyeOff } from 'lucide-react'
import DiagramEditor from './DiagramEditor'

const DiagramViewer = ({ 
  diagram, 
  onEdit, 
  onDelete, 
  readOnly = false,
  className = '' 
}) => {
  const [showEditor, setShowEditor] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const handleEdit = () => {
    setShowEditor(true)
  }

  const handleSave = async (diagramData) => {
    if (onEdit) {
      await onEdit(diagram.id, diagramData)
    }
    setShowEditor(false)
  }

  const handleExport = async () => {
    try {
      // Create download link for SVG
      if (diagram.preview_svg) {
        const blob = new Blob([diagram.preview_svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${diagram.title.replace(/\s+/g, '_')}.svg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export diagram:', error)
    }
  }

  if (!diagram) {
    return (
      <div className={`p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-center ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No diagram data</p>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {diagram.title}
          </h3>
          <div className="flex items-center space-x-2">
            {!readOnly && (
              <button
                onClick={handleEdit}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Edit diagram"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleExport}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Export diagram"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowFullscreen(!showFullscreen)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={showFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {showFullscreen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Diagram Content */}
        <div className={`relative ${showFullscreen ? 'h-96' : 'h-64'}`}>
          {diagram.preview_svg ? (
            // Show SVG preview if available
            <div 
              className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900"
              dangerouslySetInnerHTML={{ __html: diagram.preview_svg }}
            />
          ) : (
            // Show interactive Excalidraw canvas
            <Excalidraw
              initialData={diagram.excalidraw_data}
              width="100%"
              height="100%"
              UIOptions={{
                canvasActions: {
                  saveToActiveFile: false,
                  loadScene: false,
                  export: false,
                  saveAsImage: false,
                },
                tools: {
                  image: false,
                },
              }}
              viewModeEnabled={readOnly}
              zenModeEnabled={false}
              gridModeEnabled={false}
              theme="dark"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{diagram.width} × {diagram.height}</span>
            <span>{diagram.file_size ? `${Math.round(diagram.file_size / 1024)} KB` : 'Unknown size'}</span>
          </div>
        </div>
      </div>

      {/* Diagram Editor Modal */}
      {showEditor && (
        <DiagramEditor
          initialData={diagram.excalidraw_data}
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
          title={diagram.title}
          width={diagram.width}
          height={diagram.height}
        />
      )}
    </>
  )
}

export default DiagramViewer
