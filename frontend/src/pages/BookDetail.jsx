import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star, Tag, Calendar, BookOpen, FileText, Brain, Edit } from 'lucide-react'
import { libraryBooksAPI } from '../utils/api'
import FileUpload from '../components/FileUpload'
import FileList from '../components/FileList'
import RecommendationCarousel from '../components/RecommendationCarousel'
import SemanticSearchPanel from '../components/SemanticSearchPanel'
import NotesEditor from '../components/NotesEditor'
import RatingPanel from '../components/RatingPanel'
import ShelfManager from '../components/ShelfManager'

const BookDetail = () => {
  const { libraryId, bookId } = useParams()
  const [libraryBook, setLibraryBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadLibraryBook()
  }, [bookId])

  const loadLibraryBook = async () => {
    try {
      setLoading(true)
      const response = await libraryBooksAPI.getById(bookId)
      setLibraryBook(response.data)
    } catch (error) {
      console.error('Failed to load book:', error)
    } finally {
      setLoading(false)
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {book.title}
          </h1>
          {book.subtitle && (
            <p className="text-gray-600 dark:text-gray-400">
              {book.subtitle}
            </p>
          )}
        </div>
        <button className="btn-outline flex items-center space-x-2">
          <Edit className="h-4 w-4" />
          <span>Edit</span>
        </button>
      </div>

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

            {/* Rating */}
            {libraryBook.rating && (
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {libraryBook.rating}/5
                </span>
              </div>
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
    </div>
  )
}

export default BookDetail
