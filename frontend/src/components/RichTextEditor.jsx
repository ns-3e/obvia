import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Extension, Node } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import { Plugin } from 'prosemirror-state'
import { useState, useCallback, useEffect, useRef } from 'react'
import { 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Code, Type, Hash, AtSign, X
} from 'lucide-react'
import TagInput from './TagInput'
import ReferenceSelector from './ReferenceSelector'

const RichTextEditor = ({ 
  content = '', 
  onChange, 
  placeholder = 'Start writing... Type / for commands',
  className = '',
  readOnly = false,
  libraryBookId = null,
  tags = [],
  onTagsChange = null
}) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedCommand, setSelectedCommand] = useState(0)
  const [showTagInput, setShowTagInput] = useState(false)
  const [showReferenceSelector, setShowReferenceSelector] = useState(false)
  const [currentTags, setCurrentTags] = useState(tags)
  const [slashQuery, setSlashQuery] = useState('')
  const slashMenuRef = useRef(null)
  const editorRef = useRef(null)
  const autosaveTimeoutRef = useRef(null)
  const lastContentRef = useRef(content || '')

  const slashCommands = [
    { name: 'Heading 1', icon: Heading1, command: 'h1', description: 'Large heading' },
    { name: 'Heading 2', icon: Heading2, command: 'h2', description: 'Medium heading' },
    { name: 'Heading 3', icon: Heading3, command: 'h3', description: 'Small heading' },
    { name: 'Bullet List', icon: List, command: 'bullet', description: 'Unordered list' },
    { name: 'Numbered List', icon: ListOrdered, command: 'ordered', description: 'Ordered list' },
    { name: 'Task List', icon: CheckSquare, command: 'task', description: 'Checklist' },
    { name: 'Quote', icon: Quote, command: 'quote', description: 'Blockquote' },
    { name: 'Code Block', icon: Code, command: 'code', description: 'Code block' },
    { name: 'Tag', icon: Hash, command: 'tag', description: 'Add tag' },
    { name: 'Reference', icon: AtSign, command: 'reference', description: 'Link to book/chapter' },
  ]

  const filteredCommands = slashCommands.filter(cmd => 
    cmd.name.toLowerCase().includes(slashQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(slashQuery.toLowerCase())
  )

  // Custom TaskItem extension that handles Enter key properly
  const CustomTaskItem = TaskItem.extend({
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          // If we're in a task item, create a new task item instead of a hard break
          if (this.editor.isActive('taskItem')) {
            return this.editor.commands.splitListItem('taskItem')
          }
          return false
        },
        'Shift-Enter': () => {
          // Allow Shift+Enter to create a hard break within the task item
          return this.editor.commands.setHardBreak()
        }
      }
    }
  })

  // Custom Tag extension that renders as a chip
  const TagExtension = Node.create({
    name: 'tag',
    group: 'inline',
    inline: true,
    atom: true, // Makes it a single unit that can't be split
    content: 'text*',
    
    addAttributes() {
      return {
        tagName: {
          default: null,
        }
      }
    },

    parseHTML() {
      return [
        {
          tag: 'span[data-type="tag"]',
          getAttrs: (element) => ({
            tagName: element.textContent
          })
        },
      ]
    },

    renderHTML({ HTMLAttributes }) {
      return ['span', { 
        'data-type': 'tag',
        'data-tag-name': HTMLAttributes.tagName,
        class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-1 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors select-none'
      }, `#${HTMLAttributes.tagName}`]
    },

    addCommands() {
      return {
        insertTag: (tagName) => ({ commands }) => {
          return commands.insertContent({
            type: 'tag',
            attrs: { tagName },
            content: [{ type: 'text', text: tagName }]
          })
        }
      }
    },

    addKeyboardShortcuts() {
      return {
        Backspace: () => {
          // Delete the entire tag when backspace is pressed
          const { state } = this.editor
          const { selection } = state
          
          if (selection.empty && this.editor.isActive('tag')) {
            const { $from } = selection
            const node = $from.node()
            
            if (node.type.name === 'tag') {
              // Delete the entire tag node
              const start = $from.start()
              const end = $from.end()
              this.editor.commands.deleteRange({ from: start, to: end })
              return true
            }
          }
          return false
        }
      }
    },

    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleClick: (view, pos, event) => {
              const { state } = view
              const { doc } = state
              const node = doc.nodeAt(pos)
              
              if (node && node.type.name === 'tag') {
                // When clicked, open the tag input
                setShowTagInput(true)
                return true
              }
              return false
            }
          }
        })
      ]
    }
  })

  // Custom Reference extension that renders as a chip
  const ReferenceExtension = Node.create({
    name: 'reference',
    group: 'inline',
    inline: true,
    atom: true, // Makes it a single unit that can't be split
    content: 'text*',
    
    addAttributes() {
      return {
        type: {
          default: null,
        },
        title: {
          default: null,
        },
        id: {
          default: null,
        }
      }
    },

    parseHTML() {
      return [
        {
          tag: 'span[data-type="reference"]',
          getAttrs: (element) => ({
            type: element.getAttribute('data-ref-type'),
            title: element.getAttribute('data-ref-title'),
            id: element.getAttribute('data-ref-id')
          })
        },
      ]
    },

    renderHTML({ HTMLAttributes }) {
      return ['span', { 
        'data-type': 'reference',
        'data-ref-type': HTMLAttributes.type,
        'data-ref-title': HTMLAttributes.title,
        'data-ref-id': HTMLAttributes.id,
        class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mr-1 cursor-pointer hover:bg-green-200 dark:hover:bg-green-800 transition-colors select-none'
      }, `@${HTMLAttributes.type}:${HTMLAttributes.title}`]
    },

    addCommands() {
      return {
        insertReference: (reference) => ({ commands }) => {
          return commands.insertContent({
            type: 'reference',
            attrs: {
              type: reference.type,
              title: reference.data.title,
              id: reference.data.id
            },
            content: [{ type: 'text', text: `${reference.type}:${reference.data.title}` }]
          })
        }
      }
    },

    addKeyboardShortcuts() {
      return {
        Backspace: () => {
          // Delete the entire reference when backspace is pressed
          const { state } = this.editor
          const { selection } = state
          
          if (selection.empty && this.editor.isActive('reference')) {
            const { $from } = selection
            const node = $from.node()
            
            if (node.type.name === 'reference') {
              // Delete the entire reference node
              const start = $from.start()
              const end = $from.end()
              this.editor.commands.deleteRange({ from: start, to: end })
              return true
            }
          }
          return false
        }
      }
    },

    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleClick: (view, pos, event) => {
              const { state } = view
              const { doc } = state
              const node = doc.nodeAt(pos)
              
              if (node && node.type.name === 'reference') {
                // When clicked, open the reference selector
                setShowReferenceSelector(true)
                return true
              }
              return false
            }
          }
        })
      ]
    }
  })



  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      CustomTaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      TagExtension,
      ReferenceExtension,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML()
      
      // Only trigger autosave if content has actually changed
      if (htmlContent !== lastContentRef.current) {
        console.log('Content changed, triggering autosave...')
        lastContentRef.current = htmlContent
        
        // Call onChange immediately for real-time updates
        onChange?.(htmlContent)
        
        // Trigger autosave after delay
        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current)
        }
        
        autosaveTimeoutRef.current = setTimeout(() => {
          console.log('Autosave timeout triggered')
          // This will be handled by the parent component
          if (onChange) {
            console.log('Calling onChange with isAutosave=true')
            onChange(htmlContent, true) // true indicates autosave
          }
        }, 2500) // 2.5 seconds
      }
    },
  })

  const executeSlashCommand = useCallback((command) => {
    if (!editor) return
    console.log('Executing slash command:', command)

    // Remove the slash and any query text
    const queryLength = slashQuery.length + 1 // +1 for the slash
    const currentPos = editor.state.selection.from
    
    // Only delete if we're at the end of the line or if there's a slash to remove
    if (slashQuery.length > 0 || editor.state.doc.textBetween(currentPos - 1, currentPos) === '/') {
      editor.commands.deleteRange({ 
        from: currentPos - queryLength, 
        to: currentPos 
      })
    }

    // Execute the command
    switch (command.command) {
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        break
      case 'bullet':
        editor.chain().focus().toggleBulletList().run()
        break
      case 'ordered':
        editor.chain().focus().toggleOrderedList().run()
        break
      case 'task':
        editor.chain().focus().toggleTaskList().run()
        break
      case 'quote':
        editor.chain().focus().toggleBlockquote().run()
        break
      case 'code':
        editor.chain().focus().toggleCodeBlock().run()
        break
      case 'tag':
        setShowTagInput(true)
        break
      case 'reference':
        setShowReferenceSelector(true)
        break
    }

    setShowSlashMenu(false)
    setSlashQuery('')
  }, [editor, slashQuery])

  // Handle keyboard events at the component level
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!editor || readOnly) return

      // Check if the event target is within our editor
      const editorElement = editorRef.current
      if (!editorElement || !editorElement.contains(event.target)) return

      console.log('Key pressed:', event.key, 'Target:', event.target)

      // Handle slash commands
      if (event.key === '/' && !showSlashMenu) {
        console.log('Slash key detected, opening menu')
        event.preventDefault()
        
        // Get cursor position
        const { view } = editor
        const { from } = view.state.selection
        const coords = view.coordsAtPos(from)
        
        // Get the editor element position
        const editorRect = editorElement.getBoundingClientRect()
        
        setSlashMenuPosition({
          x: coords.left - editorRect.left,
          y: coords.bottom - editorRect.top + 10,
        })
        setShowSlashMenu(true)
        setSelectedCommand(0)
        setSlashQuery('')
        return
      }

      // Handle @ mentions
      if (event.key === '@' && !showSlashMenu) {
        console.log('@ key detected, opening reference selector')
        event.preventDefault()
        
        // Get cursor position
        const { view } = editor
        const { from } = view.state.selection
        const coords = view.coordsAtPos(from)
        
        // Get the editor element position
        const editorRect = editorElement.getBoundingClientRect()
        
        setSlashMenuPosition({
          x: coords.left - editorRect.left,
          y: coords.bottom - editorRect.top + 10,
        })
        setShowReferenceSelector(true)
        return
      }

      // Handle slash menu navigation and filtering
      if (showSlashMenu) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedCommand((prev) => {
            const newIndex = prev < filteredCommands.length - 1 ? prev + 1 : 0
            // Scroll to the selected item
            setTimeout(() => {
              const menuElement = slashMenuRef.current
              const selectedElement = menuElement?.querySelector(`[data-index="${newIndex}"]`)
              if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              }
            }, 0)
            return newIndex
          })
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedCommand((prev) => {
            const newIndex = prev > 0 ? prev - 1 : filteredCommands.length - 1
            // Scroll to the selected item
            setTimeout(() => {
              const menuElement = slashMenuRef.current
              const selectedElement = menuElement?.querySelector(`[data-index="${newIndex}"]`)
              if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              }
            }, 0)
            return newIndex
          })
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          if (filteredCommands.length > 0) {
            executeSlashCommand(filteredCommands[selectedCommand])
          }
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          setShowSlashMenu(false)
          setSlashQuery('')
          return
        }
        if (event.key === 'Backspace') {
          event.preventDefault()
          if (slashQuery === '') {
            // Close menu and leave the "/" character in the text
            setShowSlashMenu(false)
            setSlashQuery('')
            // Insert the "/" character back into the editor
            editor.commands.insertContent('/')
          } else {
            setSlashQuery(prev => prev.slice(0, -1))
          }
          return
        }
        if (event.key === 'Tab') {
          event.preventDefault()
          if (filteredCommands.length > 0) {
            executeSlashCommand(filteredCommands[selectedCommand])
          }
          return
        }
        // Allow typing to filter commands
        if (event.key.length === 1) {
          setSlashQuery(prev => prev + event.key)
          setSelectedCommand(0)
          return
        }
      }

      // Allow TaskItem extension to handle Enter key when in a task item
      if (event.key === 'Enter' && editor.isActive('taskItem')) {
        // Let the TaskItem extension handle this
        return
      }

      // Keyboard shortcuts (only when not in slash menu)
      if (!showSlashMenu) {
        // Bold: Cmd/Ctrl + B
        if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
          event.preventDefault()
          editor.chain().focus().toggleBold().run()
          return
        }
        // Italic: Cmd/Ctrl + I
        if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
          event.preventDefault()
          editor.chain().focus().toggleItalic().run()
          return
        }
        // Strikethrough: Cmd/Ctrl + Shift + X
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'X') {
          event.preventDefault()
          editor.chain().focus().toggleStrike().run()
          return
        }
        // Code: Cmd/Ctrl + `
        if ((event.metaKey || event.ctrlKey) && event.key === '`') {
          event.preventDefault()
          editor.chain().focus().toggleCode().run()
          return
        }
        // Undo: Cmd/Ctrl + Z
        if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          editor.chain().focus().undo().run()
          return
        }
        // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
        if ((event.metaKey || event.ctrlKey) && ((event.shiftKey && event.key === 'Z') || event.key === 'y')) {
          event.preventDefault()
          editor.chain().focus().redo().run()
          return
        }
      }
    }

    // Add event listener to the document
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [editor, readOnly, showSlashMenu, filteredCommands, selectedCommand, slashQuery, executeSlashCommand])

  const handleTagChange = (newTags) => {
    setCurrentTags(newTags)
    if (onTagsChange) {
      onTagsChange(newTags)
    }
  }

  const handleTagInsert = (tagName) => {
    if (editor) {
      editor.commands.insertTag(tagName)
    }
    setShowTagInput(false)
  }

  const handleReferenceSelect = (reference) => {
    if (editor) {
      editor.commands.insertReference(reference)
    }
    setShowReferenceSelector(false)
  }

  // Close slash menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(event.target)) {
        setShowSlashMenu(false)
        setSlashQuery('')
      }
    }

    if (showSlashMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSlashMenu])

  // Update lastContentRef when content prop changes
  useEffect(() => {
    lastContentRef.current = content || ''
  }, [content])

  // Cleanup autosave timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={`relative flex flex-col h-full ${className}`} ref={editorRef}>
      {/* Tag Input */}
      {showTagInput && (
        <div className="absolute z-50 top-0 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3 p-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Add Tags</h4>
            <button
              onClick={() => setShowTagInput(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <TagInput
            value={currentTags}
            onChange={handleTagChange}
            onTagInsert={handleTagInsert}
            placeholder="Type # to add tags..."
            type="tag"
            suggestions={['philosophy', 'science', 'fiction', 'history', 'technology']}
          />
        </div>
      )}

      {/* Reference Selector */}
      {showReferenceSelector && (
        <div className="absolute z-50 top-0 left-0 right-0">
          <ReferenceSelector
            onSelect={handleReferenceSelect}
            onCancel={() => setShowReferenceSelector(false)}
            libraryBookId={libraryBookId}
          />
        </div>
      )}

      <div className="relative flex-1 min-h-0 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
        <EditorContent 
          editor={editor} 
          className="h-full w-full prose prose-sm dark:prose-invert max-w-none focus:outline-none editor-content"
        />
        

        
        {/* Slash Command Menu */}
        {showSlashMenu && (
          <div
            ref={slashMenuRef}
            className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[280px] max-h-64 overflow-y-auto"
            style={{
              left: Math.max(0, slashMenuPosition.x),
              top: Math.max(0, slashMenuPosition.y),
            }}
          >
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Commands {slashQuery && `for "${slashQuery}"`}
              </div>
            </div>
            {filteredCommands.length > 0 ? (
              filteredCommands.map((command, index) => (
                <button
                  key={command.name}
                  data-index={index}
                  onClick={() => executeSlashCommand(command)}
                  className={`w-full px-3 py-2 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    index === selectedCommand ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <command.icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {command.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {command.description}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No commands found for "{slashQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RichTextEditor

