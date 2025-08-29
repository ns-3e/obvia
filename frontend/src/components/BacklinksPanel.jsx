import { useState, useEffect } from 'react'
import { Link, Book, FileText, ArrowUpRight, Hash } from 'lucide-react'
import { notesAPI } from '../utils/api'

const BacklinksPanel = ({ 
  noteId, 
  libraryBookId, 
  refBook, 
  refChapter, 
  refSection, 
  refSubsection,
  className = '' 
}) => {
  const [backlinks, setBacklinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (noteId || libraryBookId) {
      loadBacklinks()
    }
  }, [noteId, libraryBookId, refBook, refChapter, refSection, refSubsection])

  const loadBacklinks = async () => {
    try {
      setLoading(true)
      setError(null)

      let response
      if (noteId) {
        // Get notes that reference this note
        response = await notesAPI.getById(noteId)
        if (response.data.references) {
          setBacklinks(response.data.references)
        }
      } else if (libraryBookId) {
        // Get notes that reference the same book hierarchy
        const params = { library_book_id: libraryBookId }
        if (refBook) params.ref_book = refBook
        if (refChapter) params.ref_chapter = refChapter
        if (refSection) params.ref_section = refSection
        if (refSubsection) params.ref_subsection = refSubsection

        response = await notesAPI.getAll(params)
        setBacklinks(response.data.results || response.data)
      }
    } catch (error) {
      console.error('Failed to load backlinks:', error)
      setError('Failed to load backlinks')
    } finally {
      setLoading(false)
    }
  }

  const getReferenceType = (note) => {
    if (note.ref_subsection) return 'subsection'
    if (note.ref_section) return 'section'
    if (note.ref_chapter) return 'chapter'
    if (note.ref_book) return 'book'
    return 'general'
  }

  const getReferenceIcon = (type) => {
    switch (type) {
      case 'book':
        return <Book className="h-4 w-4" />
      case 'chapter':
        return <FileText className="h-4 w-4" />
      case 'section':
        return <FileText className="h-4 w-4" />
      case 'subsection':
        return <FileText className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  const getReferenceText = (note) => {
    if (note.ref_subsection) return `Subsection: ${note.ref_subsection.title}`
    if (note.ref_section) return `Section: ${note.ref_section.title}`
    if (note.ref_chapter) return `Chapter: ${note.ref_chapter.title}`
    if (note.ref_book) return `Book: ${note.ref_book.title}`
    return 'General Note'
  }

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (backlinks.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <Link className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No backlinks found</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Link className="h-5 w-5 text-gray-500" />
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          Referenced in ({backlinks.length})
        </h4>
      </div>

      <div className="space-y-2">
        {backlinks.map((note) => {
          const refType = getReferenceType(note)
          const refText = getReferenceText(note)
          
          return (
            <div
              key={note.id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getReferenceIcon(refType)}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {note.title}
                    </span>
                    {note.ai_generated && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {note.content_markdown?.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{refText}</span>
                    <span>•</span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BacklinksPanel
