import { useState, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { Save, X, Download, Upload } from 'lucide-react'

const DiagramEditor = ({ 
  initialData = null, 
  onSave, 
  onCancel, 
  title = 'Untitled Diagram',
  width = 800,
  height = 600 
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return

    try {
      setIsSaving(true)
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      
      const diagramData = {
        elements,
        appState,
        files: excalidrawAPI.getFiles(),
      }

      // Generate SVG preview
      const svg = await excalidrawAPI.generateSVG({
        elements,
        appState,
        files: excalidrawAPI.getFiles(),
      })

      await onSave({
        title,
        excalidraw_data: diagramData,
        preview_svg: svg,
        width,
        height,
      })
    } catch (error) {
      console.error('Failed to save diagram:', error)
    } finally {
      setIsSaving(false)
    }
  }, [excalidrawAPI, onSave, title, width, height])

  const handleExport = useCallback(async () => {
    if (!excalidrawAPI) return

    try {
      const svg = await excalidrawAPI.generateSVG({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
      })

      // Create download link
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/\s+/g, '_')}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export diagram:', error)
    }
  }, [excalidrawAPI, title])

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={onCancel}
              className="btn-outline flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Excalidraw Canvas */}
        <div className="flex-1 relative">
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={initialData}
            width={width}
            height={height}
            UIOptions={{
              canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
                export: false,
                saveAsImage: false,
              },
            }}
            theme="dark"
          />
        </div>
      </div>
    </div>
  )
}

export default DiagramEditor
