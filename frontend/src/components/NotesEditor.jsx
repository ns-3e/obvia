import { useState, useEffect } from 'react'
import { Edit, Brain, Plus, Trash2, Loader } from 'lucide-react'
import { notesAPI } from '../utils/api'
import RichTextEditor from './RichTextEditor'

const NotesEditor = ({ libraryBookId }) => {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [lastAutosave, setLastAutosave] = useState(null)
  const [isAutosaving, setIsAutosaving] = useState(false)
  const [autosaveError, setAutosaveError] = useState(null)
  


  useEffect(() => {
    if (libraryBookId) {
      loadNotes()
    }
  }, [libraryBookId])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const response = await notesAPI.getByLibraryBook(libraryBookId)
      setNotes(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load notes:', error)
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = () => {
    setEditingNote({
      id: null,
      title: '',
      content_markdown: '',
      content_blocks: null,
      ai_generated: false
    })
    setAiResponse('')
    setLastAutosave(null)
    setIsAutosaving(false)
    setAutosaveError(null)
  }

  const handleEditNote = (note) => {
    setEditingNote({ ...note })
    setAiResponse('')
    setLastAutosave(null)
    setIsAutosaving(false)
    setAutosaveError(null)
  }



  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      await notesAPI.delete(noteId)
      await loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      setError('Failed to delete note')
    }
  }

  const handleAiAssist = async () => {
    if (!aiPrompt.trim() || !editingNote?.id) {
      setError('Please enter a prompt and save the note first')
      return
    }

    try {
      setAiLoading(true)
      setError(null)

      const response = await notesAPI.aiAssist(editingNote.id, {
        prompt: aiPrompt,
        context_scope: 'all'
      })

      setAiResponse(response.data.ai_response)
      setAiPrompt('')
    } catch (error) {
      console.error('AI assistance failed:', error)
      if (error.response?.status === 503) {
        setError('AI assistance is not enabled. Please configure AI_PROVIDER in your environment.')
      } else {
        setError(error.response?.data?.error || 'AI assistance failed')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const insertAiResponse = () => {
    if (aiResponse && editingNote) {
      setEditingNote({
        ...editingNote,
        content_markdown: editingNote.content_markdown + '\n\n' + aiResponse
      })
      setAiResponse('')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stripHtmlTags = (html) => {
    if (!html) return ''
    // Remove HTML tags and decode HTML entities
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .trim()
  }

  const formatAutosaveTime = (date) => {
    if (!date) return null
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return '1 hour ago'
    if (hours < 24) return `${hours} hours ago`
    
    // For longer periods, show date and time
    const days = Math.floor(hours / 24)
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days} days ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }



  const handleRichEditorChange = (htmlContent, isAutosave = false) => {
    console.log('handleRichEditorChange called:', { isAutosave, hasEditingNote: !!editingNote, hasId: editingNote?.id })
    if (editingNote) {
      const newContent = {
        ...editingNote,
        content_blocks_html: htmlContent,
        // Keep markdown for backward compatibility
        content_markdown: htmlContent
      }
      
      setEditingNote(newContent)

      // Handle autosave
      if (isAutosave) {
        console.log('Calling handleAutosave...')
        handleAutosave(editingNote.id, newContent)
      }
    }
  }

  const handleAutosave = async (noteId, noteData) => {
    try {
      console.log('Autosaving note...', { noteId, isNewNote: !noteId })
      setIsAutosaving(true)
      
      let savedNote
      if (noteId) {
        // Update existing note
        savedNote = await notesAPI.update(noteId, noteData)
      } else {
        // Create new note if it has a title
        if (noteData.title && noteData.title.trim()) {
          savedNote = await notesAPI.create({
            ...noteData,
            library_book: libraryBookId
          })
          // Update the editing note with the new ID
          setEditingNote(prev => ({
            ...prev,
            id: savedNote.data.id
          }))
        } else {
          console.log('Skipping autosave for new note without title')
          return
        }
      }
      
      console.log('Note autosaved successfully')
      setLastAutosave(new Date())
      setAutosaveError(null)
    } catch (error) {
      console.error('Autosave failed:', error)
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      })
      setAutosaveError(error.response?.data?.detail || error.message || 'Autosave failed')
    } finally {
      setIsAutosaving(false)
    }
  }

  if (loading && notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Notes ({notes.length})
        </h3>
        <button
          onClick={handleCreateNote}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Notes List */}
      {!editingNote && (
        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No notes yet
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Create your first note to get started.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div 
                key={note.id} 
                className="card p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => handleEditNote(note)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {note.title}
                      </h4>
                      {note.ai_generated && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                          AI Generated
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {stripHtmlTags(note.content_markdown || note.content_blocks_html || '').substring(0, 150)}
                      {(note.content_markdown || note.content_blocks_html || '').length > 150 && '...'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(note.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Prevent card click
                        handleEditNote(note)
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Prevent card click
                        handleDeleteNote(note.id)
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Note Editor */}
      {editingNote && (
        <div className="card p-6">
          <div className="space-y-4">
            {/* Title */}
            <input
              type="text"
              value={editingNote.title}
              onChange={(e) => {
                const newTitle = e.target.value
                setEditingNote({ ...editingNote, title: newTitle })
                
                // Trigger autosave for title changes if note has content
                if (newTitle.trim() && (editingNote.content_markdown || editingNote.content_blocks_html)) {
                  setTimeout(() => {
                    handleAutosave(editingNote.id, {
                      ...editingNote,
                      title: newTitle
                    })
                  }, 2000) // 2 second delay for title changes
                }
              }}
              placeholder="Note title..."
              className="input text-lg font-medium"
            />

            {/* Autosave Status */}
            {(lastAutosave || isAutosaving || autosaveError) && (
              <div className={`text-xs transition-all duration-200 ${
                autosaveError 
                  ? 'text-red-500 dark:text-red-400'
                  : isAutosaving
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {autosaveError ? (
                  <div className="flex items-center space-x-1">
                    <span>⚠️ Save failed</span>
                    <button 
                      onClick={() => {
                        // Clear error by triggering a new autosave attempt
                        if (editingNote) {
                          handleAutosave(editingNote.id, editingNote)
                        }
                      }}
                      className="underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : isAutosaving ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <span>Last saved {formatAutosaveTime(lastAutosave)}</span>
                )}
              </div>
            )}

            {/* Editor Controls */}
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* <button
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  <span>AI Assist</span>
                </button> */}
              {/* </div>
            </div> */}

            {/* AI Panel
            {showAiPanel && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  AI Assistance
                </h4>
                <div className="space-y-3">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ask AI to help with your note..."
                    className="input h-20 resize-none"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAiAssist}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {aiLoading ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                      <span>Get AI Help</span>
                    </button>
                  </div>
                  {aiResponse && (
                    <div className="space-y-2">
                      <div className="p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {aiResponse}
                        </p>
                      </div>
                      <button
                        onClick={insertAiResponse}
                        className="btn-secondary text-sm"
                      >
                        Insert into Note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )} */}

            {/* Content Editor */}
            <div className="h-96">
              {/* Rich Text Editor */}
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0">
                  <RichTextEditor
                    content={editingNote.content_blocks_html || editingNote.content_markdown}
                    onChange={handleRichEditorChange}
                    placeholder="Start writing... Type / for commands"
                    className="h-full"
                    libraryBookId={libraryBookId}
                    tags={editingNote.tags || []}
                    onTagsChange={(tags) => setEditingNote({ ...editingNote, tags })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotesEditor
