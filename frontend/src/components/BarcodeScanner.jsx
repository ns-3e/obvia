import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, X, AlertCircle } from 'lucide-react'

const BarcodeScanner = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [hasPermission, setHasPermission] = useState(null)
  const [activeStream, setActiveStream] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const lastDetectedCode = useRef(null)

  // Convert ISBN-10 to ISBN-13
  const convertISBN10To13 = (isbn10) => {
    try {
      // Remove any non-digit characters
      const cleanIsbn = isbn10.replace(/\D/g, '')
      
      if (cleanIsbn.length !== 10) {
        return null
      }
      
      // Convert to ISBN-13 by adding 978 prefix and calculating new check digit
      const isbn13Base = '978' + cleanIsbn.slice(0, 9)
      
      // Calculate check digit for ISBN-13
      let sum = 0
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(isbn13Base[i])
        sum += digit * (i % 2 === 0 ? 1 : 3)
      }
      
      const checkDigit = (10 - (sum % 10)) % 10
      const isbn13 = isbn13Base + checkDigit
      
      console.log(`Converted ISBN-10 ${cleanIsbn} to ISBN-13 ${isbn13}`)
      return isbn13
    } catch (error) {
      console.error('Error converting ISBN-10 to ISBN-13:', error)
      return null
    }
  }
  


  useEffect(() => {
    // Configure scanner to specifically look for EAN-13 barcodes
    codeReaderRef.current = new BrowserMultiFormatReader()
    
    // Add keyboard event listener for Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      console.log('BarcodeScanner: Component unmounting, cleaning up camera')
      cleanupCamera()
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setIsScanning(true)
      
      // Check for camera permission and get stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setHasPermission(true)
      setActiveStream(stream)
      
      // Set the stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      // Start scanning with improved detection and format hints
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result && !isProcessing) {
            const detectedCode = result.getText()
            console.log('Barcode detected:', detectedCode, 'Format:', result.getBarcodeFormat())
            
            // Clean the detected code (remove spaces, dashes, etc.)
            const cleanCode = detectedCode.replace(/[-\s]/g, '')
            
            // Prevent duplicate detections
            if (lastDetectedCode.current === cleanCode) {
              console.log('Duplicate detection ignored:', cleanCode)
              return
            }
            
            // Validate ISBN-13 format (13 digits starting with 978 or 979)
            if (/^97[89]\d{10}$/.test(cleanCode)) {
              console.log('Valid ISBN-13 detected:', cleanCode)
              lastDetectedCode.current = cleanCode
              setIsProcessing(true)
              onScan(cleanCode)
              stopScanning()
            } else if (/^\d{10}$/.test(cleanCode)) {
              // Convert ISBN-10 to ISBN-13 if needed
              console.log('ISBN-10 detected, converting to ISBN-13:', cleanCode)
              const isbn13 = convertISBN10To13(cleanCode)
              if (isbn13) {
                lastDetectedCode.current = isbn13
                setIsProcessing(true)
                onScan(isbn13)
                stopScanning()
              }
            } else {
              console.log('Invalid barcode format:', cleanCode)
            }
          }
          if (error) {
            try {
              // Convert error to string for easier checking
              const errorString = error.toString ? error.toString() : String(error);
              const errorMessage = error.message || errorString;
              
              // Check for various "no barcode found" error types
              const isNoBarcodeError = 
                error.name === 'NotFoundException' || 
                error.name === 'NoMultiFormatReaderException' ||
                error.name === 'DOMException' ||
                errorMessage.includes('No MultiFormat Readers were able to detect') ||
                errorMessage.includes('No barcode found') ||
                errorMessage.includes('No code detected') ||
                errorMessage.includes('NotFoundException') ||
                errorMessage.includes('NoMultiFormatReaderException') ||
                errorMessage.includes('No MultiFormat Readers were able to detect the code') ||
                errorMessage.includes('No MultiFormat Readers') ||
                errorMessage.includes('were able to detect') ||
                errorMessage.includes('No MultiFormat Readers were able to detect the code.');
              
              if (!isNoBarcodeError) {
                console.error('Scanning error:', error)
              }
            } catch (debugError) {
              // If error handling itself fails, just log the original error
              console.error('Error in error handling:', debugError);
              console.error('Original scanning error:', error);
            }
          }
        },
        {
          // Add format hints to improve EAN-13 detection
          formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E']
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
    console.log('BarcodeScanner: Stopping scanning')
    try {
      // Stop the scanner first
      if (codeReaderRef.current) {
        codeReaderRef.current.reset()
      }
      
      // Stop the video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(track => {
          track.stop()
          console.log('Camera track stopped:', track.kind)
        })
      }
      // Reset the video element
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    } catch (error) {
      console.error('Error stopping scanning:', error)
    }
    setIsScanning(false)
    setIsProcessing(false)
  }

  const cleanupCamera = () => {
    console.log('BarcodeScanner: Cleaning up camera access')
    try {
      // Stop the tracked active stream
      if (activeStream) {
        activeStream.getTracks().forEach(track => {
          track.stop()
          console.log('Active stream track stopped:', track.kind)
        })
        setActiveStream(null)
      }
      
      // Also stop any video element streams
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(track => {
          track.stop()
          console.log('Video element track stopped:', track.kind)
        })
        videoRef.current.srcObject = null
      }
    } catch (error) {
      console.error('Error during camera cleanup:', error)
    }
  }

  const handleClose = () => {
    console.log('BarcodeScanner: handleClose called')
    stopScanning()
    cleanupCamera()
    lastDetectedCode.current = null
    setIsProcessing(false)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={handleClose}
    >
      <div 
        className="card max-w-md w-full" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Scan ISBN Barcode
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-500"
            type="button"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
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
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 border-2 border-gray-400 border-dashed rounded-2xl pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-24 border-2 border-green-500 bg-green-500 bg-opacity-10 rounded-lg">
                        <div className="text-center text-green-500 text-xs mt-1">Position barcode here</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {isProcessing ? 'Processing barcode...' : 'Scanning... Position the barcode clearly in the green box.'}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>• Ensure good lighting on the barcode</p>
                    <p>• Hold the book steady for 2-3 seconds</p>
                    <p>• Keep the barcode within the green guide box</p>
                  </div>
                  <button
                    onClick={stopScanning}
                    disabled={isProcessing}
                    className="btn-secondary"
                  >
                    {isProcessing ? 'Processing...' : 'Stop Scanning'}
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
