import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star, Tag, Calendar, BookOpen, FileText, Brain, Edit, Trash2, Save, X, Loader, Library, Move } from 'lucide-react'
import { libraryBooksAPI, booksAPI, librariesAPI } from '../utils/api'
import FileUpload from '../components/FileUpload'
import FileList from '../components/FileList'
import RecommendationCarousel from '../components/RecommendationCarousel'
import SemanticSearchPanel from '../components/SemanticSearchPanel'
import NotesEditor from '../components/NotesEditor'
import RatingPanel from '../components/RatingPanel'
import ShelfManager from '../components/ShelfManager'
import BookDeleteDialog from '../components/BookDeleteDialog'
import Notification from '../components/Notification'
import CoverImageManager from '../components/CoverImageManager'
import BookCategorizer from '../components/BookCategorizer'

const BookDetail = () => {
  const { libraryId, bookId: libraryBookId } = useParams()
  const [libraryBook, setLibraryBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  const [libraries, setLibraries] = useState([])
  const [selectedLibrary, setSelectedLibrary] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, book: null, libraryBookId: null })
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'success' })

  useEffect(() => {
    loadLibraryBook()
  }, [libraryBookId])

  const loadLibraryBook = async () => {
    try {
      setLoading(true)
      const response = await libraryBooksAPI.getById(libraryBookId)
      setLibraryBook(response.data)
    } catch (error) {
      console.error('Failed to load book:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLibraries = async () => {
    try {
      const response = await librariesAPI.getAll()
      const librariesData = response.data.results || response.data || []
      setLibraries(librariesData)
      
      // Set current library if book has library information
      if (libraryBook?.library?.id) {
        setSelectedLibrary(libraryBook.library.id)
      } else if (librariesData.length > 0) {
        setSelectedLibrary(librariesData[0].id)
      }
    } catch (error) {
      console.error('Failed to load libraries:', error)
    }
  }

  const handleEditClick = () => {
    if (libraryBook?.book) {
      setEditFormData({
        title: libraryBook.book.title || '',
        subtitle: libraryBook.book.subtitle || '',
        description: libraryBook.book.description || '',
        publisher: libraryBook.book.publisher || '',
        publication_date: libraryBook.book.publication_date ? libraryBook.book.publication_date.split('T')[0] : '',
        page_count: libraryBook.book.page_count || '',
        language: libraryBook.book.language || ''
      })
      setSelectedLibrary(libraryBook.library?.id || '')
      loadLibraries()
      setIsEditing(true)
      setEditError(null)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditFormData({})
    setEditError(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSaveEdit = async () => {
    setEditLoading(true)
    setEditError(null)

    try {
      // Clean up the data
      const cleanedData = { ...editFormData }
      
      // Remove empty strings and convert page_count to number
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') {
          delete cleanedData[key]
        }
      })
      
      if (cleanedData.page_count) {
        cleanedData.page_count = parseInt(cleanedData.page_count, 10)
      }

      // Update book data
      const response = await booksAPI.update(libraryBook.book.id, cleanedData)
      
      // Move book to new library if library changed
      if (selectedLibrary && libraryBook.library?.id !== selectedLibrary) {
        try {
          await librariesAPI.addBook(selectedLibrary, libraryBook.book.id)
        } catch (moveError) {
          console.error('Failed to move book to new library:', moveError)
          // Don't fail the entire operation if moving fails
        }
      }
      
      // Update the local state
      setLibraryBook(prev => ({
        ...prev,
        book: response.data,
        library: libraries.find(lib => lib.id === selectedLibrary) || prev.library
      }))
      
      setIsEditing(false)
      setEditFormData({})
      
      setNotification({
        isVisible: true,
        message: 'Book updated successfully',
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to update book:', error)
      setEditError(error.response?.data?.message || 'Failed to update book')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteBook = () => {
    setDeleteDialog({ 
      isOpen: true, 
      book: libraryBook?.book, 
      libraryBookId: libraryBookId 
    })
  }

  const handleRemoveFromLibrary = async () => {
    try {
      const response = await libraryBooksAPI.removeFromLibrary(deleteDialog.libraryBookId)
      setDeleteDialog({ isOpen: false, book: null, libraryBookId: null })
      setNotification({
        isVisible: true,
        message: response.data.message,
        type: 'success'
      })
      // Navigate back to library after a short delay
      setTimeout(() => {
        window.location.href = `/libraries/${libraryId}`
      }, 1500)
    } catch (error) {
      console.error('Failed to remove book from library:', error)
      setNotification({
        isVisible: true,
        message: error.response?.data?.error || 'Failed to remove book from library',
        type: 'error'
      })
    }
  }

  const handleDeleteForever = async () => {
    try {
      const response = await libraryBooksAPI.deleteForever(deleteDialog.libraryBookId)
      setDeleteDialog({ isOpen: false, book: null, libraryBookId: null })
      setNotification({
        isVisible: true,
        message: response.data.message,
        type: 'success'
      })
      // Navigate back to library after a short delay
      setTimeout(() => {
        window.location.href = `/libraries/${libraryId}`
      }, 1500)
    } catch (error) {
      console.error('Failed to delete book forever:', error)
      setNotification({
        isVisible: true,
        message: error.response?.data?.error || 'Failed to delete book forever',
        type: 'error'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading book...</p>
        </div>
      </div>
    )
  }

  if (!libraryBook) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Book not found</p>
      </div>
    )
  }

  const { book } = libraryBook

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'cover', label: 'Cover & Categories', icon: Tag },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'ai', label: 'AI', icon: Brain },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to={`/libraries/${libraryId}`}
          className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                name="title"
                value={editFormData.title}
                onChange={handleInputChange}
                className="text-2xl font-bold bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-gray-900 dark:focus:border-gray-100 outline-none w-full"
                placeholder="Enter book title"
              />
              <input
                type="text"
                name="subtitle"
                value={editFormData.subtitle}
                onChange={handleInputChange}
                className="text-gray-600 dark:text-gray-400 bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-gray-900 dark:focus:border-gray-100 outline-none w-full"
                placeholder="Enter book subtitle"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {book.title}
              </h1>
              {book.subtitle && (
                <p className="text-gray-600 dark:text-gray-400">
                  {book.subtitle}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleCancelEdit}
                className="btn-outline flex items-center space-x-2"
                disabled={editLoading}
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="btn-primary flex items-center space-x-2"
              >
                {editLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleEditClick}
                className="btn-outline flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button 
                onClick={handleDeleteBook}
                className="btn-outline flex items-center space-x-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {editError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{editError}</p>
        </div>
      )}

      {/* Book Info Card */}
      <div className="card p-6">
        <div className="flex space-x-6">
          {/* Cover */}
          <div className="flex-shrink-0">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-32 h-40 object-cover rounded-2xl shadow-soft"
              />
            ) : (
              <div className="w-32 h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Book Details */}
          <div className="flex-1 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                {/* Library Selection */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Move className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Move to Library
                    </label>
                  </div>
                  <select
                    value={selectedLibrary}
                    onChange={(e) => setSelectedLibrary(e.target.value)}
                    className="input w-full"
                  >
                    {libraries.map(library => (
                      <option key={library.id} value={library.id}>
                        {library.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Publisher
                    </label>
                    <input
                      type="text"
                      name="publisher"
                      value={editFormData.publisher}
                      onChange={handleInputChange}
                      className="input w-full"
                      placeholder="Publisher name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Publication Date
                    </label>
                    <input
                      type="date"
                      name="publication_date"
                      value={editFormData.publication_date}
                      onChange={handleInputChange}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Page Count
                    </label>
                    <input
                      type="number"
                      name="page_count"
                      value={editFormData.page_count}
                      onChange={handleInputChange}
                      min="1"
                      className="input w-full"
                      placeholder="Number of pages"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <input
                      type="text"
                      name="language"
                      value={editFormData.language}
                      onChange={handleInputChange}
                      className="input w-full"
                      placeholder="Language code (e.g., en, es, fr)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="input w-full resize-none"
                    placeholder="Enter book description"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {book.title}
                  </h2>
                  {book.authors && book.authors.length > 0 && (
                    <p className="text-gray-700 dark:text-gray-300">
                      by {book.authors.map(author => author.name).join(', ')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {book.publisher && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Publisher:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{book.publisher}</span>
                    </div>
                  )}
                  
                  {book.publication_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(book.publication_date).getFullYear()}
                      </span>
                    </div>
                  )}
                  
                  {book.page_count && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Pages:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{book.page_count}</span>
                    </div>
                  )}
                  
                  {book.language && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Language:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{book.language}</span>
                    </div>
                  )}
                </div>

                {book.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {book.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {libraryBook.tags && libraryBook.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {libraryBook.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="badge-primary flex items-center space-x-1"
                        >
                          <Tag className="h-3 w-3" />
                          <span>{tag.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Book Overview
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage ratings, shelves, and get book recommendations.
                </p>
              </div>
              
              {/* Ratings */}
              {libraryBook?.id && (
                <RatingPanel 
                  libraryBookId={libraryBook.id}
                  onRatingChange={() => {
                    setLibraryBook({ ...libraryBook })
                  }}
                />
              )}
              
              {/* Shelves */}
              {libraryBook?.id && (
                <ShelfManager 
                  libraryBookId={libraryBook.id}
                  onShelfChange={() => {
                    setLibraryBook({ ...libraryBook })
                  }}
                />
              )}
              
              {/* Recommendations */}
              {libraryBook?.id && (
                <RecommendationCarousel 
                  libraryBookId={libraryBook.id}
                  libraryId={libraryId}
                  limit={5}
                />
              )}
            </div>
          )}

          {activeTab === 'cover' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Cover Image & Categories
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Manage cover images and automatically categorize your book with AI.
                </p>
              </div>
              
              {/* Cover Image Manager */}
              <CoverImageManager 
                book={book}
                onCoverChange={(newCoverUrl) => {
                  // Update the local state
                  setLibraryBook(prev => ({
                    ...prev,
                    book: {
                      ...prev.book,
                      cover_url: newCoverUrl
                    }
                  }))
                }}
              />
              
              {/* Book Categorizer */}
              <BookCategorizer 
                book={book}
                libraryBookId={libraryBook?.id}
                onTagsChange={(newTags) => {
                  // Update the local state
                  setLibraryBook(prev => ({
                    ...prev,
                    tags: newTags
                  }))
                }}
              />
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Notes
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create and manage notes for this book with Markdown support and AI assistance.
                </p>
              </div>
              
              {/* Notes Editor */}
              {libraryBook?.id && (
                <NotesEditor 
                  libraryBookId={libraryBook.id}
                  onNoteSaved={() => {
                    // This will trigger a re-render if needed
                    setLibraryBook({ ...libraryBook })
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Files
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Upload PDF or EPUB files to this book. PDF text will be automatically extracted for search.
                </p>
              </div>
              
              <FileUpload 
                libraryBookId={libraryBook?.id} 
                onUploadComplete={() => {
                  // This will trigger a re-render of FileList
                  setLibraryBook({ ...libraryBook })
                }}
              />
              
              {libraryBook?.id && (
                <FileList libraryBookId={libraryBook.id} />
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  AI Features
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  AI-powered features for enhanced search and content analysis.
                </p>
              </div>
              
              {/* Semantic Search */}
              <SemanticSearchPanel 
                libraryId={libraryId}
                onResultClick={(result) => {
                  // Handle result click - could navigate to the specific item
                  console.log('Semantic search result clicked:', result)
                }}
              />
            </div>
          )}


        </div>
      </div>

      {/* Book Delete Dialog */}
      <BookDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, book: null, libraryBookId: null })}
        onRemoveFromLibrary={handleRemoveFromLibrary}
        onDeleteForever={handleDeleteForever}
        bookTitle={deleteDialog.book?.title}
        libraryName={libraryBook?.library?.name || 'Unassigned'}
      />

      {/* Notification */}
      <Notification
        isVisible={notification.isVisible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ isVisible: false, message: '', type: 'success' })}
      />
    </div>
  )
}

export default BookDetail
