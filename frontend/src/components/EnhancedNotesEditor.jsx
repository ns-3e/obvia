import { useState, useEffect, useRef } from 'react'
import { 
  Edit, Eye, EyeOff, Brain, Save, Plus, Trash2, Loader, 
  Sidebar, SidebarClose, Link, Hash, BookOpen, Settings
} from 'lucide-react'
import { notesAPI } from '../utils/api'
import RichTextEditor from './RichTextEditor'
import BacklinksPanel from './BacklinksPanel'
import SmartOutliner from './SmartOutliner'
import TagInput from './TagInput'

const EnhancedNotesEditor = ({ libraryBookId, onNoteSaved }) => {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [useRichEditor, setUseRichEditor] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [sidebarTab, setSidebarTab] = useState('outline') // 'outline', 'backlinks', 'tags'
  const [currentTags, setCurrentTags] = useState([])
  
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
      content_blocks: null,
      tags: [],
      ai_generated: false
    })
    setShowPreview(false)
    setAiResponse('')
    setCurrentTags([])
  }

  const handleEditNote = (note) => {
    setEditingNote({ ...note })
    setShowPreview(false)
    setAiResponse('')
    setCurrentTags(note.tags || [])
  }

  const handleSaveNote = async () => {
    if (!editingNote.title.trim() || (!editingNote.content_markdown.trim() && !editingNote.content_blocks)) {
      setError('Title and content are required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const noteData = {
        ...editingNote,
        tags: currentTags
      }

      if (editingNote.id) {
        // Update existing note
        await notesAPI.update(editingNote.id, noteData)
      } else {
        // Create new note
        await notesAPI.create({
          ...noteData,
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

  const handleRichEditorChange = (htmlContent) => {
    if (editingNote) {
      setEditingNote({
        ...editingNote,
        content_blocks_html: htmlContent,
        // Keep markdown for backward compatibility
        content_markdown: htmlContent
      })
    }
  }

  const renderSidebar = () => {
    if (!showSidebar || !editingNote) return null

    return (
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Note Tools</h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <SidebarClose className="h-4 w-4" />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-3">
            <button
              onClick={() => setSidebarTab('outline')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                sidebarTab === 'outline'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Outline
            </button>
            <button
              onClick={() => setSidebarTab('backlinks')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                sidebarTab === 'backlinks'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Backlinks
            </button>
            <button
              onClick={() => setSidebarTab('tags')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                sidebarTab === 'tags'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Tags
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'outline' && (
            <SmartOutliner
              content={editingNote.content_blocks_html || editingNote.content_markdown}
              refBook={editingNote.ref_book}
              refChapter={editingNote.ref_chapter}
              refSection={editingNote.ref_section}
              refSubsection={editingNote.ref_subsection}
            />
          )}
          
          {sidebarTab === 'backlinks' && (
            <BacklinksPanel
              noteId={editingNote.id}
              libraryBookId={libraryBookId}
              refBook={editingNote.ref_book}
              refChapter={editingNote.ref_chapter}
              refSection={editingNote.ref_section}
              refSubsection={editingNote.ref_subsection}
            />
          )}
          
          {sidebarTab === 'tags' && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-4 w-4 text-gray-500" />
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Note Tags</h4>
              </div>
              <TagInput
                value={currentTags}
                onChange={setCurrentTags}
                placeholder="Add tags..."
                type="tag"
                suggestions={['philosophy', 'science', 'fiction', 'history', 'technology', 'research', 'ideas']}
              />
            </div>
          )}
        </div>
      </div>
    )
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
        <div className="flex items-center space-x-2">
          {editingNote && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="btn-secondary flex items-center space-x-2"
            >
              {showSidebar ? <SidebarClose className="h-4 w-4" /> : <Sidebar className="h-4 w-4" />}
              <span>Tools</span>
            </button>
          )}
          <button
            onClick={handleCreateNote}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </button>
        </div>
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
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(note.created_at)}</span>
                      {note.tags && note.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{note.tags.length} tags</span>
                        </>
                      )}
                    </div>
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
        <div className="flex h-[600px]">
          {/* Main Editor */}
          <div className="flex-1 flex flex-col">
            <div className="card p-6 flex-1 flex flex-col">
              <div className="space-y-4 flex-1">
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
                      onClick={() => setUseRichEditor(!useRichEditor)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>{useRichEditor ? 'Markdown Mode' : 'Rich Editor'}</span>
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
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Rich Text Editor or Markdown Editor */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {useRichEditor ? 'Rich Text Editor' : 'Markdown Editor'}
                    </label>
                    {useRichEditor ? (
                      <RichTextEditor
                        content={editingNote.content_blocks_html || editingNote.content_markdown}
                        onChange={handleRichEditorChange}
                        placeholder="Start writing... Type / for commands"
                        className="border border-gray-200 dark:border-gray-700 rounded-2xl flex-1"
                        libraryBookId={libraryBookId}
                        tags={currentTags}
                        onTagsChange={setCurrentTags}
                      />
                    ) : (
                      <textarea
                        ref={textareaRef}
                        value={editingNote.content_markdown}
                        onChange={(e) => setEditingNote({ ...editingNote, content_markdown: e.target.value })}
                        placeholder="Write your note in Markdown..."
                        className="input h-full resize-none font-mono text-sm"
                      />
                    )}
                  </div>

                  {/* Preview */}
                  {showPreview && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preview
                      </label>
                      <div className="input h-full overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: editingNote.content_blocks_html || editingNote.content_html || editingNote.content_markdown
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {renderSidebar()}
        </div>
      )}
    </div>
  )
}

export default EnhancedNotesEditor
