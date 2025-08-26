import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, X, AlertCircle } from 'lucide-react'

const BarcodeScanner = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [hasPermission, setHasPermission] = useState(null)
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader()
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset()
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setIsScanning(true)
      
      // Check for camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setHasPermission(true)
      
      // Start scanning
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const isbn = result.getText()
            // Validate ISBN format (basic check)
            if (/^\d{10}(\d{3})?$/.test(isbn.replace(/[-\s]/g, ''))) {
              onScan(isbn)
              stopScanning()
            }
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('Scanning error:', error)
          }
        }
      )
    } catch (err) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError') {
        setHasPermission(false)
        setError('Camera permission denied. Please allow camera access to scan barcodes.')
      } else {
        setError('Failed to access camera. Please check your camera permissions.')
      }
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
    }
    setIsScanning(false)
  }

  const handleClose = () => {
    console.log('BarcodeScanner: handleClose called')
    stopScanning()
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Scan ISBN Barcode
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={startScanning}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="text-center">
              {!isScanning ? (
                <div>
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Position the barcode within the camera view to scan the ISBN.
                  </p>
                  <button
                    onClick={startScanning}
                    className="btn-primary"
                  >
                    Start Scanning
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative mb-4">
                    <video
                      ref={videoRef}
                      className="w-full h-64 object-cover rounded-2xl"
                    />
                    <div className="absolute inset-0 border-2 border-gray-400 border-dashed rounded-2xl pointer-events-none" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Scanning... Position the barcode clearly in the frame.
                  </p>
                  <button
                    onClick={stopScanning}
                    className="btn-secondary"
                  >
                    Stop Scanning
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner
