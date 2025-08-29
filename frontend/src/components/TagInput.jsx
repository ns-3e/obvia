import { useState, useEffect, useRef } from 'react'
import { X, Hash, AtSign } from 'lucide-react'

const TagInput = ({ 
  value = [], 
  onChange, 
  onTagInsert,
  placeholder = 'Add tags...',
  type = 'tag', // 'tag' or 'mention'
  suggestions = [],
  className = '' 
}) => {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  useEffect(() => {
    if (inputValue.startsWith(type === 'tag' ? '#' : '@')) {
      const query = inputValue.slice(1).toLowerCase()
      const filtered = suggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(query)
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
    }
  }, [inputValue, suggestions, type])

  // Auto-focus the input when suggestions are shown
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showSuggestions])

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (filteredSuggestions.length > 0) {
          addTag(filteredSuggestions[selectedIndex])
        } else if (inputValue.trim()) {
          addTag(inputValue.trim())
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setInputValue('')
      }
    } else if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue.trim())
    }
  }

  const addTag = (tagText) => {
    const cleanTag = tagText.replace(/^[#@]/, '').trim()
    if (cleanTag && !value.includes(cleanTag)) {
      const newTags = [...value, cleanTag]
      onChange(newTags)
      
      // If onTagInsert is provided, call it to insert the tag into the editor
      if (onTagInsert) {
        onTagInsert(cleanTag)
      }
    }
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeTag = (tagToRemove) => {
    const newTags = value.filter(tag => tag !== tagToRemove)
    onChange(newTags)
  }

  const handleSuggestionClick = (suggestion) => {
    addTag(suggestion)
  }

  const handleInputFocus = () => {
    if (inputValue.startsWith(type === 'tag' ? '#' : '@') && filteredSuggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 min-h-[42px] focus-within:ring-2 focus-within:ring-gray-500 dark:focus-within:ring-gray-400 focus-within:border-transparent">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
          >
            {type === 'tag' ? <Hash className="h-3 w-3" /> : <AtSign className="h-3 w-3" />}
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {type === 'tag' ? <Hash className="h-4 w-4 text-gray-400" /> : <AtSign className="h-4 w-4 text-gray-400" />}
                <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TagInput
