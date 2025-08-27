import React, { useState, useEffect, useRef } from 'react';
import { Camera, Square, Trash2, Download, HelpCircle, Library, RotateCcw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { librariesAPI, booksAPI } from '../utils/api';
import { BrowserMultiFormatReader } from '@zxing/browser';

const BulkScan = () => {
  const navigate = useNavigate();
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
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [showDuplicateFlash, setShowDuplicateFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const seenISBNsRef = useRef(new Set());
  const lastDetectionTimeRef = useRef(0);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const activeStreamRef = useRef(null);
  const lastDetectedCodeRef = useRef(null);
  const audioContextRef = useRef(null);

  // Load libraries on component mount
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        setIsLoading(true);
        const response = await librariesAPI.getAll();
        const librariesData = response.data.results || response.data || [];
        setLibraries(librariesData);
        if (librariesData.length > 0) {
          setSelectedLibrary(librariesData[0].id);
        }
      } catch (error) {
        console.error('Failed to load libraries:', error);
        setLibraries([]); // Ensure libraries is always an array
      } finally {
        setIsLoading(false);
      }
    };
    loadLibraries();
  }, []);

  // Initialize scanner and audio on component mount
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    return () => {
      cleanupCamera();
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Initialize audio context on first user interaction
  const initializeAudio = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context initialized');
      } catch (error) {
        console.warn('Audio context not available:', error);
      }
    }
  };

  // Convert ISBN-10 to ISBN-13
  const convertISBN10To13 = (isbn10) => {
    try {
      const cleanIsbn = isbn10.replace(/\D/g, '');
      
      if (cleanIsbn.length !== 10) {
        return null;
      }
      
      const isbn13Base = '978' + cleanIsbn.slice(0, 9);
      
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(isbn13Base[i]);
        sum += digit * (i % 2 === 0 ? 1 : 3);
      }
      
      const checkDigit = (10 - (sum % 10)) % 10;
      const isbn13 = isbn13Base + checkDigit;
      
      console.log(`Converted ISBN-10 ${cleanIsbn} to ISBN-13 ${isbn13}`);
      return isbn13;
    } catch (error) {
      console.error('Error converting ISBN-10 to ISBN-13:', error);
      return null;
    }
  };

  const startScanning = async () => {
    try {
      // Initialize audio on first user interaction
      initializeAudio();
      
      setCameraError(null);
      setScanStatus('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      activeStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setScanStatus('Camera ready - scanning for barcodes...');
      
      // Start scanning with improved detection and format hints
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result && !isProcessing) {
            const detectedCode = result.getText();
            console.log('Barcode detected:', detectedCode, 'Format:', result.getBarcodeFormat());
            
            // Clean the detected code (remove spaces, dashes, etc.)
            const cleanCode = detectedCode.replace(/[-\s]/g, '');
            
            // Prevent duplicate detections
            if (lastDetectedCodeRef.current === cleanCode) {
              console.log('Duplicate detection ignored:', cleanCode);
              return;
            }
            
            // Validate ISBN-13 format (13 digits starting with 978 or 979)
            if (/^97[89]\d{10}$/.test(cleanCode)) {
              console.log('Valid ISBN-13 detected:', cleanCode);
              lastDetectedCodeRef.current = cleanCode;
              setIsProcessing(true);
              handleISBNDetection(cleanCode);
            } else if (/^\d{10}$/.test(cleanCode)) {
              // Convert ISBN-10 to ISBN-13 if needed
              console.log('ISBN-10 detected, converting to ISBN-13:', cleanCode);
              const isbn13 = convertISBN10To13(cleanCode);
              if (isbn13) {
                lastDetectedCodeRef.current = isbn13;
                setIsProcessing(true);
                handleISBNDetection(isbn13);
              }
            } else if (/^\d{5}$/.test(cleanCode)) {
              // Ignore 5-digit barcodes (price codes, etc.)
              console.log('Ignoring 5-digit barcode:', cleanCode);
            } else {
              console.log('Invalid barcode format:', cleanCode);
            }
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('Scanning error:', error);
          }
        },
        {
          // Add format hints to improve EAN-13 detection
          formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E']
        }
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setHasPermission(false);
        setCameraError('Camera permission denied. Please allow camera access to scan barcodes.');
      } else {
        setCameraError('Failed to access camera. Please check your camera permissions.');
      }
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    console.log('Stopping scanning and cutting camera access');
    try {
      // First, reset the barcode reader to stop any ongoing scanning
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        // Force stop any ongoing video processing
        codeReaderRef.current.stopAsyncDecode();
      }
      
      // Stop ALL camera tracks from active stream
      if (activeStreamRef.current) {
        const tracks = activeStreamRef.current.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('Active stream track stopped:', track.kind);
        });
        activeStreamRef.current = null;
      }
      
      // Stop ALL camera tracks from video element
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('Video element track stopped:', track.kind);
        });
        videoRef.current.srcObject = null;
      }
      
      // Completely disable video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = '';
        videoRef.current.load();
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        // Remove all event listeners
        videoRef.current.onloadedmetadata = null;
        videoRef.current.onplay = null;
        videoRef.current.onpause = null;
      }
      
      // Force garbage collection of any remaining stream references
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      }
      
      // Reset camera state
      setHasPermission(null);
      setCameraError(null);
      
    } catch (error) {
      console.error('Error stopping scanning:', error);
    }
    
    setIsScanning(false);
    setIsProcessing(false);
    setScanStatus('Camera access completely stopped');
  };

  const cleanupCamera = () => {
    console.log('Cleaning up camera access');
    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Active stream track stopped:', track.kind);
        });
        activeStreamRef.current = null;
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('Video element track stopped:', track.kind);
        });
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error('Error during camera cleanup:', error);
    }
  };

  // Play success sound (pleasant chime)
  const playSuccessSound = () => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContextRef.current.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play success sound:', error);
    }
  };

  // Play error sound (lower tone)
  const playErrorSound = () => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(400, audioContextRef.current.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContextRef.current.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play error sound:', error);
    }
  };

  // Play neutral sound (for already existing books)
  const playNeutralSound = () => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(500, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.15);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.15);
    } catch (error) {
      console.warn('Could not play neutral sound:', error);
    }
  };

  // Play duplicate sound (short beep)
  const playDuplicateSound = () => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(600, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.15, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play duplicate sound:', error);
    }
  };

  // Play success chime (visual + audio)
  const playSuccessChime = () => {
    setShowSuccessFlash(true);
    setTimeout(() => setShowSuccessFlash(false), 300);
    playSuccessSound();
  };

  // Play duplicate tick (visual + audio)
  const playDuplicateTick = () => {
    setShowDuplicateFlash(true);
    setTimeout(() => setShowDuplicateFlash(false), 200);
    playDuplicateSound();
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
    
    // Reset processing flag after a short delay to allow next scan
    setTimeout(() => {
      setIsProcessing(false);
      lastDetectedCodeRef.current = null;
    }, 1000);
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
      
      // Check for "book already exists" errors (both 409 and 400 with specific message)
      const isAlreadyExistsError = 
        error.response?.status === 409 || 
        (error.response?.status === 400 && 
         error.response?.data?.error?.includes('already in this library'));
      
      if (isAlreadyExistsError) {
        // Book already exists - this is not an error, just a skip
        setScanQueue(prev => prev.map(item => 
          item.isbn === queueItem.isbn 
            ? { ...item, status: 'skipped', error: 'Book is already in library' }
            : item
        ));
        setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        setScanStatus(`Book is already in library`);
        playNeutralSound(); // Use neutral sound for already existing books
      } else {
        // Handle actual errors
        let errorMessage = 'Unknown error occurred';
        if (error.response?.status === 404) {
          errorMessage = 'Book not found in database';
        } else if (error.response?.status >= 500) {
          errorMessage = 'Server error - please try again';
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'Network error - check connection';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        
        // Update status to error
        setScanQueue(prev => prev.map(item => 
          item.isbn === queueItem.isbn 
            ? { ...item, status: 'error', error: errorMessage }
            : item
        ));
        
        setScanStatus(`Error: ${errorMessage}`);
        playErrorSound();
      }
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

  const handleManualTest = () => {
    // Test with a sample ISBN
    const testISBN = '9780141439518'; // Example ISBN-13
    console.log('Manual test: simulating barcode detection with', testISBN);
    handleISBNDetection(testISBN);
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
- Distance: 6-12 inches from camera
- Works with ISBN-10, ISBN-13, and UPC-A barcodes

Troubleshooting:
- If scanning isn't working, try the "Test Scan" button
- Check browser console for error messages
- Ensure camera permissions are granted
- Try different lighting conditions`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading libraries...</p>
        </div>
      </div>
    );
  }

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
                <option value="">Select a library</option>
                {(libraries || []).map(library => (
                  <option key={library.id} value={library.id}>
                    {library.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={isScanning ? stopScanning : startScanning}
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

              <button
                onClick={handleManualTest}
                className="btn-outline flex items-center space-x-2"
                title="Test scanning functionality"
              >
                <Camera size={16} />
                <span>Test Scan</span>
              </button>

              {scanQueue.length > 0 && (
                <button
                  onClick={() => {
                    // Stop scanning first, then hard redirect
                    if (isScanning) {
                      stopScanning();
                    }
                    // Ensure we have a valid library ID
                    if (selectedLibrary) {
                      // Small delay to ensure cleanup completes, then hard redirect
                      setTimeout(() => {
                        window.location.href = `/libraries/${selectedLibrary}`;
                      }, 200);
                    } else {
                      console.error('No library selected for navigation');
                    }
                  }}
                  className="btn-primary flex items-center space-x-2"
                  title="Go to library with scanned books"
                >
                  <Library size={16} />
                  <span>Done - Go to Library</span>
                </button>
              )}
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

          {/* Status */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Status: {scanStatus}
            </div>
            {isScanning && (
              <div className="text-xs text-blue-500 dark:text-blue-400">
                🔄 Scanning...
              </div>
            )}
          </div>
        </div>

        {/* Scanner and Queue Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Scanner */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scanner
            </h2>
            
            <div className="relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
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
                      onClick={startScanning}
                      className="btn-primary"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              )}

              {/* Scanner Not Started Overlay */}
              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                  <div className="text-center text-white p-6">
                    <Camera size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Scanner Ready</p>
                    <p className="text-sm mb-4">Click "Start Scanning" to begin</p>
                  </div>
                </div>
              )}

              {/* Scanning Overlay */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-blue-500 border-dashed rounded-lg w-64 h-32 relative">
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-5"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
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
              <p>• Supports ISBN-10, ISBN-13, and UPC-A barcodes</p>
            </div>
          </div>

          {/* Right: Queue Panel */}
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
                        <X size={14} />
                      </button>
                                         </div>
                   </div>
                 ))
               )}
             </div>
             
             {/* Done Button */}
             {scanQueue.length > 0 && (
               <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                 <button
                   onClick={() => {
                     // Stop scanning first, then hard redirect
                     if (isScanning) {
                       stopScanning();
                     }
                     // Ensure we have a valid library ID
                     if (selectedLibrary) {
                       // Small delay to ensure cleanup completes, then hard redirect
                       setTimeout(() => {
                         window.location.href = `/libraries/${selectedLibrary}`;
                       }, 200);
                     } else {
                       console.error('No library selected for navigation');
                     }
                   }}
                   className="w-full btn-primary flex items-center justify-center space-x-2"
                 >
                   <Library size={16} />
                   <span>Done - Go to Library ({libraries.find(l => l.id === selectedLibrary)?.name || 'Selected Library'})</span>
                 </button>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 };

export default BulkScan;
