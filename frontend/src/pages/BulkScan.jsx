import React, { useState, useRef, useEffect } from 'react';
import { Camera, Square, Trash2, Download, HelpCircle, Library, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { librariesAPI, booksAPI } from '../utils/api';
import { BrowserMultiFormatReader } from '@zxing/library';

const BulkScan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [scanQueue, setScanQueue] = useState([]);
  const [scanStatus, setScanStatus] = useState('Ready');
  const [stats, setStats] = useState({
    scanned: 0,
    imported: 0,
    skipped: 0,
    errors: 0
  });
  const [cameraError, setCameraError] = useState(null);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [showDuplicateFlash, setShowDuplicateFlash] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scanningIntervalRef = useRef(null);
  const seenISBNsRef = useRef(new Set());
  const lastDetectionTimeRef = useRef(0);
  const successAudioRef = useRef(null);
  const duplicateAudioRef = useRef(null);
  const navigate = useNavigate();

  // Initialize barcode reader and audio
  useEffect(() => {
    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
    } catch (error) {
      console.error('Failed to initialize barcode reader:', error);
    }
    
    // Create audio elements for feedback
    successAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    duplicateAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    
    // Set audio properties
    successAudioRef.current.volume = 0.3;
    duplicateAudioRef.current.volume = 0.2;
    
    return () => {
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (error) {
          console.error('Error resetting barcode reader:', error);
        }
      }
    };
  }, []);

  // Load libraries on component mount
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const response = await librariesAPI.getAll();
        setLibraries(response.data);
        if (response.data.length > 0) {
          setSelectedLibrary(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to load libraries:', error);
      }
    };
    loadLibraries();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopScanningLoop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Play success chime
  const playSuccessChime = () => {
    if (successAudioRef.current) {
      successAudioRef.current.currentTime = 0;
      successAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    setShowSuccessFlash(true);
    setTimeout(() => setShowSuccessFlash(false), 300);
  };

  // Play duplicate tick
  const playDuplicateTick = () => {
    if (duplicateAudioRef.current) {
      duplicateAudioRef.current.currentTime = 0;
      duplicateAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    setShowDuplicateFlash(true);
    setTimeout(() => setShowDuplicateFlash(false), 200);
  };

  // ISBN validation and normalization
  const validateAndNormalizeISBN = (code) => {
    // Remove any non-digit characters
    const digits = code.replace(/\D/g, '');
    
    // Handle ISBN-13 (978 or 979 prefix)
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      // Validate check digit
      const checkDigit = parseInt(digits[12]);
      const sum = digits.slice(0, 12).split('').reduce((acc, digit, index) => {
        const num = parseInt(digit);
        return acc + (num * (index % 2 === 0 ? 1 : 3));
      }, 0);
      const calculatedCheckDigit = (10 - (sum % 10)) % 10;
      
      if (checkDigit === calculatedCheckDigit) {
        return digits;
      }
    }
    
    // Handle ISBN-10 (convert to ISBN-13)
    if (digits.length === 10) {
      // Validate ISBN-10 check digit
      const checkDigit = digits[9] === 'X' ? 10 : parseInt(digits[9]);
      const sum = digits.slice(0, 9).split('').reduce((acc, digit, index) => {
        const num = parseInt(digit);
        return acc + (num * (10 - index));
      }, 0) + checkDigit;
      
      if (sum % 11 === 0) {
        // Convert to ISBN-13 by adding 978 prefix and recalculating check digit
        const isbn13Base = '978' + digits.slice(0, 9);
        const sum13 = isbn13Base.split('').reduce((acc, digit, index) => {
          const num = parseInt(digit);
          return acc + (num * (index % 2 === 0 ? 1 : 3));
        }, 0);
        const newCheckDigit = (10 - (sum13 % 10)) % 10;
        return isbn13Base + newCheckDigit;
      }
    }
    
    // Handle UPC-A (convert to ISBN-13 when safe)
    if (digits.length === 12) {
      // Only convert UPC-A to ISBN-13 if it's a book (starts with 0, 1, 2, 3, 4, 5, 6, 7, 8, 9)
      // Books typically start with 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 in UPC-A
      const firstDigit = parseInt(digits[0]);
      if (firstDigit >= 0 && firstDigit <= 9) {
        // Validate UPC-A check digit
        const checkDigit = parseInt(digits[11]);
        const sum = digits.slice(0, 11).split('').reduce((acc, digit, index) => {
          const num = parseInt(digit);
          return acc + (num * (index % 2 === 0 ? 3 : 1));
        }, 0);
        const calculatedCheckDigit = (10 - (sum % 10)) % 10;
        
        if (checkDigit === calculatedCheckDigit) {
          // Convert to ISBN-13 by adding 978 prefix and recalculating check digit
          const isbn13Base = '978' + digits.slice(0, 11);
          const sum13 = isbn13Base.split('').reduce((acc, digit, index) => {
            const num = parseInt(digit);
            return acc + (num * (index % 2 === 0 ? 1 : 3));
          }, 0);
          const newCheckDigit = (10 - (sum13 % 10)) % 10;
          return isbn13Base + newCheckDigit;
        }
      }
    }
    
    return null;
  };

  // Barcode detection loop
  const startScanningLoop = () => {
    if (!videoRef.current || !codeReaderRef.current) return;

    const scanFrame = async () => {
      try {
        const result = await codeReaderRef.current.decodeFromVideoElement(videoRef.current);
        
        if (result && result.getText()) {
          const detectedCode = result.getText();
          console.log('Detected barcode:', detectedCode);
          
          // Validate and normalize ISBN
          const normalizedISBN = validateAndNormalizeISBN(detectedCode);
          
          if (normalizedISBN) {
            handleISBNDetection(normalizedISBN);
          } else {
            console.log('Invalid or non-book barcode detected:', detectedCode);
            setScanStatus(`Invalid barcode: ${detectedCode}`);
          }
        }
      } catch (error) {
        // Ignore errors - they're expected when no barcode is visible
        if (error.name !== 'NotFoundException') {
          console.log('Scanning error:', error.message);
        }
      }
    };

    // Scan at ~8 FPS (every 125ms)
    scanningIntervalRef.current = setInterval(scanFrame, 125);
  };

  const stopScanningLoop = () => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
      scanningIntervalRef.current = null;
    }
  };

  // Handle ISBN detection with debouncing
  const handleISBNDetection = (isbn) => {
    const now = Date.now();
    const debounceTime = 1500; // 1.5 seconds debounce
    
    // Check if this ISBN was recently detected
    if (now - lastDetectionTimeRef.current < debounceTime) {
      console.log('Debounced detection:', isbn);
      return;
    }
    
    // Check if this ISBN was already seen in this session
    if (seenISBNsRef.current.has(isbn)) {
      console.log('Duplicate ISBN in session:', isbn);
      setScanStatus(`Duplicate skipped: ${isbn}`);
      playDuplicateTick();
      return;
    }
    
    lastDetectionTimeRef.current = now;
    seenISBNsRef.current.add(isbn);
    
    console.log('New ISBN detected:', isbn);
    setScanStatus(`Detected: ${isbn}`);
    playSuccessChime();
    
    // Add to queue and start import process
    addToQueue(isbn);
  };

  // Add book to queue and start import
  const addToQueue = async (isbn) => {
    const timestamp = new Date().toLocaleTimeString();
    
    const queueItem = {
      isbn,
      title: null,
      author: null,
      cover_url: null,
      status: 'queued',
      timestamp,
      targetLibrary: selectedLibrary
    };
    
    setScanQueue(prev => [queueItem, ...prev]);
    setStats(prev => ({ ...prev, scanned: prev.scanned + 1 }));
    
    // Start import process
    importBook(queueItem);
  };

  // Import book to library
  const importBook = async (queueItem) => {
    try {
      // Update status to fetching
      setScanQueue(prev => prev.map(item => 
        item.isbn === queueItem.isbn 
          ? { ...item, status: 'fetching' }
          : item
      ));
      
      // First, ingest the book to get metadata
      const ingestResponse = await booksAPI.ingest(queueItem.isbn);
      const bookData = ingestResponse.data;
      
      // Update queue item with book data
      const updatedItem = {
        ...queueItem,
        title: bookData.title,
        author: bookData.authors?.map(a => a.name).join(', '),
        cover_url: bookData.cover_url,
        book_id: bookData.id
      };
      
      // Check if target library has changed since this item was queued
      if (updatedItem.targetLibrary !== selectedLibrary) {
        // Update the target library to current selection
        updatedItem.targetLibrary = selectedLibrary;
        setScanQueue(prev => prev.map(item => 
          item.isbn === queueItem.isbn 
            ? { ...updatedItem, status: 'queued' }
            : item
        ));
        return; // Re-queue with new target library
      }
      
      // Add book to library
      await librariesAPI.addBook(selectedLibrary, bookData.id);
      
      // Update status to imported
      setScanQueue(prev => prev.map(item => 
        item.isbn === queueItem.isbn 
          ? { ...updatedItem, status: 'imported' }
          : item
      ));
      
      setStats(prev => ({ ...prev, imported: prev.imported + 1 }));
      setScanStatus(`Imported: ${bookData.title}`);
      
    } catch (error) {
      console.error('Import error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error.response?.status === 409) {
        errorMessage = 'Book already exists in library';
        setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
      } else if (error.response?.status === 404) {
        errorMessage = 'Book not found in database';
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error - please try again';
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Network error - check connection';
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      } else {
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      }
      
      // Update status to error
      setScanQueue(prev => prev.map(item => 
        item.isbn === queueItem.isbn 
          ? { ...item, status: 'error', error: errorMessage }
          : item
      ));
      
      setScanStatus(`Error: ${errorMessage}`);
    }
  };

  // Retry import for failed items
  const retryImport = async (queueItem) => {
    if (queueItem.status === 'error') {
      // Reset status and retry
      const retryItem = { ...queueItem, status: 'queued', error: null };
      setScanQueue(prev => prev.map(item => 
        item.isbn === queueItem.isbn 
          ? retryItem
          : item
      ));
      
      // Start import process again
      setTimeout(() => importBook(retryItem), 100);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanStatus('Requesting camera access...');

      // Request camera access with constraints
      const constraints = {
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanStatus('Camera ready - scanning for barcodes...');
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError(error.message);
      
      if (error.name === 'NotAllowedError') {
        setScanStatus('Camera access denied. Please allow camera permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        setScanStatus('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        setScanStatus('Camera is in use by another application. Please close other apps using the camera.');
      } else {
        setScanStatus(`Camera error: ${error.message}`);
      }
      
      return false;
    }
  };

  const stopCamera = () => {
    stopScanningLoop();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setScanStatus('Camera stopped');
  };

  const handleStartScanning = async () => {
    if (!selectedLibrary) {
      alert('Please select a target library first');
      return;
    }

    setIsScanning(true);
    const success = await startCamera();
    
    if (success) {
      // Start barcode detection loop after camera is ready
      setTimeout(() => {
        startScanningLoop();
      }, 1000);
    } else {
      setIsScanning(false);
    }
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    stopCamera();
  };

  const handleRetryCamera = async () => {
    setCameraError(null);
    const success = await startCamera();
    if (!success) {
      setIsScanning(false);
    } else {
      setTimeout(() => {
        startScanningLoop();
      }, 1000);
    }
  };

  const handleClearQueue = () => {
    if (scanQueue.length > 0) {
      if (window.confirm(`Clear all ${scanQueue.length} items from the queue?`)) {
        setScanQueue([]);
        setStats({ scanned: 0, imported: 0, skipped: 0, errors: 0 });
        seenISBNsRef.current.clear();
        lastDetectionTimeRef.current = 0;
      }
    }
  };

  const handleExportCSV = () => {
    if (scanQueue.length === 0) {
      alert('No items to export');
      return;
    }

    const csvContent = [
      'ISBN,Title,Author,Status,Timestamp',
      ...scanQueue.map(item => 
        `${item.isbn},"${item.title || ''}","${item.author || ''}",${item.status},${item.timestamp}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-scan-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRemoveFromQueue = (index) => {
    setScanQueue(prev => prev.filter((_, i) => i !== index));
  };

  const handleShowHelp = () => {
    alert(`Bulk Scanner Help:

1. Select a target library from the dropdown
2. Click "Start Scanning" to begin
3. Hold books with barcodes in front of the camera
4. Each unique book will be automatically imported
5. Use "Clear Queue" to reset the session
6. Export CSV for record keeping

Tips:
- Ensure good lighting
- Hold books steady for 1-2 seconds
- Keep barcode clearly visible
- Distance: 6-12 inches from camera`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      
      if (e.key === 'Enter' && !isScanning && selectedLibrary) {
        handleStartScanning();
      } else if (e.key === 'Escape' && isScanning) {
        handleStopScanning();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleClearQueue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScanning, selectedLibrary]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Bulk Scanner
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShowHelp}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Help"
              >
                <HelpCircle size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Library size={16} />
                <span>Target Library:</span>
              </label>
              <select
                value={selectedLibrary || ''}
                onChange={(e) => setSelectedLibrary(e.target.value)}
                className="input max-w-xs"
                disabled={isScanning}
              >
                {libraries.map(library => (
                  <option key={library.id} value={library.id}>
                    {library.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={isScanning ? handleStopScanning : handleStartScanning}
                disabled={!selectedLibrary}
                className={`btn-primary flex items-center space-x-2 ${
                  !selectedLibrary ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isScanning ? (
                  <>
                    <Square size={16} />
                    <span>Stop Scanning</span>
                  </>
                ) : (
                  <>
                    <Camera size={16} />
                    <span>Start Scanning</span>
                  </>
                )}
              </button>

              <button
                onClick={handleClearQueue}
                disabled={scanQueue.length === 0}
                className="btn-outline flex items-center space-x-2"
              >
                <Trash2 size={16} />
                <span>Clear Queue</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={scanQueue.length === 0}
                className="btn-outline flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center space-x-6 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Scanned: <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.scanned}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Imported: <span className="font-semibold text-green-600 dark:text-green-400">{stats.imported}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Skipped: <span className="font-semibold text-yellow-600 dark:text-yellow-400">{stats.skipped}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Errors: <span className="font-semibold text-red-600 dark:text-red-400">{stats.errors}</span>
            </span>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Keyboard shortcuts: Enter to start, Esc to stop, Cmd/Ctrl+K to clear queue
          </div>
        </div>

        {/* Scanner Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Camera Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Camera Preview
            </h2>
            
            <div className="relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Scanning Overlay */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-blue-500 border-dashed rounded-lg w-64 h-32 relative">
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-10"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Flash */}
              {showSuccessFlash && (
                <div className="absolute inset-0 bg-green-500 bg-opacity-20 animate-pulse"></div>
              )}

              {/* Duplicate Flash */}
              {showDuplicateFlash && (
                <div className="absolute inset-0 bg-yellow-500 bg-opacity-20 animate-pulse"></div>
              )}

              {/* Camera Error Overlay */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                  <div className="text-center text-white p-6">
                    <Camera size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Camera Error</p>
                    <p className="text-sm mb-4">{cameraError}</p>
                    <button
                      onClick={handleRetryCamera}
                      className="btn-primary"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              )}

              {/* Status Text */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-center">
                  {scanStatus}
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>• Hold books steady for 1-2 seconds</p>
              <p>• Ensure good lighting and clear barcode visibility</p>
              <p>• Distance: 6-12 inches from camera</p>
            </div>
          </div>

          {/* Right: Live Queue Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scan Queue ({scanQueue.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scanQueue.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Camera size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No books scanned yet</p>
                  <p className="text-sm">Start scanning to see books appear here</p>
                </div>
              ) : (
                scanQueue.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    {/* Cover Image */}
                    <div className="w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                      {item.cover_url ? (
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No cover</span>
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title || `ISBN: ${item.isbn}`}
                      </h3>
                      {item.author && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {item.author}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {item.isbn} • {item.timestamp}
                      </p>
                      {item.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {item.error}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'imported' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        item.status === 'queued' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        item.status === 'fetching' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        item.status === 'skipped' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {item.status}
                      </span>
                      
                      {/* Retry button for failed items */}
                      {item.status === 'error' && (
                        <button
                          onClick={() => retryImport(item)}
                          className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Retry import"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRemoveFromQueue(index)}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        title="Remove from queue"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkScan;
