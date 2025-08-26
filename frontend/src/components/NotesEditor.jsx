import { useState, useEffect, useRef } from 'react'
import { Edit, Eye, EyeOff, Brain, Save, Plus, Trash2, Loader } from 'lucide-react'
import { notesAPI } from '../utils/api'

const NotesEditor = ({ libraryBookId, onNoteSaved }) => {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  
  const textareaRef = useRef(null)

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
      ai_generated: false
    })
    setShowPreview(false)
    setAiResponse('')
  }

  const handleEditNote = (note) => {
    setEditingNote({ ...note })
    setShowPreview(false)
    setAiResponse('')
  }

  const handleSaveNote = async () => {
    if (!editingNote.title.trim() || !editingNote.content_markdown.trim()) {
      setError('Title and content are required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (editingNote.id) {
        // Update existing note
        await notesAPI.update(editingNote.id, editingNote)
      } else {
        // Create new note
        await notesAPI.create({
          ...editingNote,
          library_book: libraryBookId
        })
      }

      setEditingNote(null)
      await loadNotes()
      if (onNoteSaved) {
        onNoteSaved()
      }
    } catch (error) {
      console.error('Failed to save note:', error)
      setError('Failed to save note')
    } finally {
      setLoading(false)
    }
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
              <div key={note.id} className="card p-4">
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
                      {note.content_markdown.substring(0, 150)}...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(note.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEditNote(note)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
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
              onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
              placeholder="Note title..."
              className="input text-lg font-medium"
            />

            {/* Editor Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
                </button>
                <button
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  <span>AI Assist</span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingNote(null)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={loading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* AI Panel */}
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
            )}

            {/* Content Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Markdown Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Markdown Editor
                </label>
                <textarea
                  ref={textareaRef}
                  value={editingNote.content_markdown}
                  onChange={(e) => setEditingNote({ ...editingNote, content_markdown: e.target.value })}
                  placeholder="Write your note in Markdown..."
                  className="input h-96 resize-none font-mono text-sm"
                />
              </div>

              {/* Preview */}
              {showPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview
                  </label>
                  <div className="input h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: editingNote.content_html || editingNote.content_markdown
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotesEditor
