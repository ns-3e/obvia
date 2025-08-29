import { useState, useEffect, useRef } from 'react'
import { Search, Book, FileText, Layers, ChevronRight, X } from 'lucide-react'
import { booksAPI } from '../utils/api'

const ReferenceSelector = ({ 
  onSelect, 
  onCancel, 
  libraryBookId,
  className = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookHierarchy, setBookHierarchy] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('books') // 'books', 'chapters', 'sections'
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef(null)
  const componentRef = useRef(null)

  useEffect(() => {
    if (searchQuery.trim()) {
      searchBooks()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  // Auto-focus the search input when component mounts
  useEffect(() => {
    if (searchRef.current && activeTab === 'books') {
      searchRef.current.focus()
    } else if (componentRef.current && activeTab !== 'books') {
      // Focus the component itself for keyboard navigation in secondary menus
      componentRef.current.focus()
    }
  }, [activeTab])

  // Reset selected index when search results change
  useEffect(() => {
    // If we have a book reference button, start with it selected (-1)
    // Otherwise start with the first item (0)
    const hasBookReferenceButton = selectedBook && activeTab === 'chapters'
    setSelectedIndex(hasBookReferenceButton ? -1 : 0)
  }, [searchResults, bookHierarchy, selectedBook, activeTab])

  // Handle keyboard navigation for the entire component
  useEffect(() => {
    const handleKeyDown = (event) => {
      const currentItems = activeTab === 'books' ? searchResults : bookHierarchy
      const hasBookReferenceButton = selectedBook && activeTab === 'chapters'
      const totalItems = hasBookReferenceButton ? currentItems.length + 1 : currentItems.length
      
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex(prev => {
          if (hasBookReferenceButton && prev === -1) {
            return 0 // Move from book reference button to first chapter
          }
          return prev < currentItems.length - 1 ? prev + 1 : (hasBookReferenceButton ? -1 : 0)
        })
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex(prev => {
          if (hasBookReferenceButton && prev === 0) {
            return -1 // Move from first chapter to book reference button
          }
          return prev > 0 ? prev - 1 : (hasBookReferenceButton ? -1 : currentItems.length - 1)
        })
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        if (hasBookReferenceButton && selectedIndex === -1) {
          handleBookReference()
        } else if (currentItems.length > 0 && selectedIndex >= 0) {
          const selectedItem = currentItems[selectedIndex]
          if (activeTab === 'books') {
            handleBookSelect(selectedItem)
          } else if (activeTab === 'chapters') {
            handleChapterSelect(selectedItem)
          } else if (activeTab === 'sections') {
            handleSectionSelect(selectedItem)
          } else if (activeTab === 'subsections') {
            handleSubsectionSelect(selectedItem)
          }
        }
      } else if (event.key === 'Escape') {
        onCancel()
      }
    }

    // Add event listener to the component
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [activeTab, searchResults, bookHierarchy, selectedIndex, selectedBook])

  const searchBooks = async () => {
    try {
      setLoading(true)
      const response = await booksAPI.getAll({ search: searchQuery })
      setSearchResults(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to search books:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBookHierarchy = async (bookId) => {
    try {
      setLoading(true)
      const response = await booksAPI.getById(bookId)
      setSelectedBook(response.data)
      setBookHierarchy(response.data.chapters || [])
      setActiveTab('chapters')
    } catch (error) {
      console.error('Failed to load book hierarchy:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setActiveTab('chapters')
    loadBookHierarchy(book.id)
  }

  const handleChapterSelect = (chapter) => {
    if (chapter.sections && chapter.sections.length > 0) {
      setBookHierarchy(chapter.sections)
      setActiveTab('sections')
    } else {
      onSelect({ type: 'chapter', data: chapter, book: selectedBook })
    }
  }

  const handleSectionSelect = (section) => {
    if (section.subsections && section.subsections.length > 0) {
      setBookHierarchy(section.subsections)
      setActiveTab('subsections')
    } else {
      onSelect({ type: 'section', data: section, book: selectedBook })
    }
  }

  const handleSubsectionSelect = (subsection) => {
    onSelect({ type: 'subsection', data: subsection, book: selectedBook })
  }

  const handleBookReference = () => {
    if (selectedBook) {
      onSelect({ type: 'book', data: selectedBook })
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'book':
        return <Book className="h-4 w-4" />
      case 'chapter':
        return <FileText className="h-4 w-4" />
      case 'section':
        return <Layers className="h-4 w-4" />
      case 'subsection':
        return <ChevronRight className="h-4 w-4" />
      default:
        return <Book className="h-4 w-4" />
    }
  }

  const getTitle = (type) => {
    switch (type) {
      case 'books':
        return 'Select Book'
      case 'chapters':
        return `${selectedBook?.title} - Chapters`
      case 'sections':
        return 'Sections'
      case 'subsections':
        return 'Subsections'
      default:
        return 'Select Reference'
    }
  }

  const renderBreadcrumb = () => {
    const breadcrumbs = []
    if (selectedBook) {
      breadcrumbs.push(
        <button
          key="book"
          onClick={() => {
            setSelectedBook(null)
            setActiveTab('books')
            setSearchQuery('')
          }}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {selectedBook.title}
        </button>
      )
    }
    
    if (activeTab !== 'books') {
      breadcrumbs.push(
        <span key="separator" className="text-gray-400">/</span>,
        <span key="current" className="text-gray-700 dark:text-gray-300 capitalize">
          {activeTab}
        </span>
      )
    }

    return (
      <div className="flex items-center gap-2 text-sm mb-4">
        {breadcrumbs}
      </div>
    )
  }

  return (
    <div 
      ref={componentRef}
      tabIndex={-1}
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {getTitle(activeTab)}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Breadcrumb */}
        {selectedBook && renderBreadcrumb()}

        {/* Search */}
        {activeTab === 'books' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Book Reference Button */}
        {selectedBook && activeTab === 'chapters' && (
          <button
            onClick={handleBookReference}
            className={`w-full mb-4 p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              selectedIndex === -1 ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Book className="h-5 w-5 text-gray-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Reference entire book
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedBook.title}
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Results List */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : activeTab === 'books' ? (
            // Books list
            <div className="space-y-2">
              {searchResults.map((book, index) => (
                <button
                  key={book.id}
                  onClick={() => handleBookSelect(book)}
                  className={`w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Book className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {book.title}
                      </div>
                      {book.authors && book.authors.length > 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          by {book.authors.map(a => a.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Chapters/Sections list
            <div className="space-y-2">
              {bookHierarchy.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (activeTab === 'chapters') {
                      handleChapterSelect(item)
                    } else if (activeTab === 'sections') {
                      handleSectionSelect(item)
                    } else if (activeTab === 'subsections') {
                      handleSubsectionSelect(item)
                    }
                  }}
                  className={`w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getIcon(activeTab.slice(0, -1))}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.title}
                      </div>
                      {item.number && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {activeTab === 'chapters' ? 'Chapter' : 'Section'} {item.number}
                        </div>
                      )}
                    </div>
                    {(item.sections || item.subsections) && (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReferenceSelector
