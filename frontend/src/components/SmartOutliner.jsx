import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Hash, Book, FileText, Layers, ChevronRight as ChevronRightIcon } from 'lucide-react'

const SmartOutliner = ({ 
  content = '', 
  refBook, 
  refChapter, 
  refSection, 
  refSubsection,
  className = '' 
}) => {
  const [outline, setOutline] = useState([])
  const [expandedSections, setExpandedSections] = useState(new Set())
  const [activeSection, setActiveSection] = useState(null)

  useEffect(() => {
    generateOutline()
  }, [content, refBook, refChapter, refSection, refSubsection])

  const generateOutline = () => {
    const sections = []
    
    // Add book hierarchy references
    if (refBook || refChapter || refSection || refSubsection) {
      const hierarchySection = {
        id: 'hierarchy',
        title: 'Book References',
        type: 'hierarchy',
        level: 0,
        children: []
      }

      if (refBook) {
        hierarchySection.children.push({
          id: 'ref-book',
          title: refBook.title,
          type: 'book',
          level: 1,
          icon: Book
        })
      }

      if (refChapter) {
        hierarchySection.children.push({
          id: 'ref-chapter',
          title: refChapter.title,
          type: 'chapter',
          level: 1,
          icon: FileText
        })
      }

      if (refSection) {
        hierarchySection.children.push({
          id: 'ref-section',
          title: refSection.title,
          type: 'section',
          level: 1,
          icon: Layers
        })
      }

      if (refSubsection) {
        hierarchySection.children.push({
          id: 'ref-subsection',
          title: refSubsection.title,
          type: 'subsection',
          level: 1,
          icon: ChevronRightIcon
        })
      }

      sections.push(hierarchySection)
    }

    // Parse content for headings
    if (content) {
      const headingSection = {
        id: 'headings',
        title: 'Document Structure',
        type: 'headings',
        level: 0,
        children: []
      }

      // Simple regex to find headings (h1, h2, h3)
      const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi
      let match
      let headingCount = 0

      while ((match = headingRegex.exec(content)) !== null) {
        const level = parseInt(match[1])
        const title = match[2].replace(/<[^>]*>/g, '').trim() // Remove HTML tags
        
        if (title) {
          headingCount++
          headingSection.children.push({
            id: `heading-${headingCount}`,
            title,
            type: `h${level}`,
            level,
            icon: Hash
          })
        }
      }

      if (headingSection.children.length > 0) {
        sections.push(headingSection)
      }
    }

    // Add tags section if content contains tags
    const tagRegex = /#(\w+)/g
    const tags = [...new Set(content.match(tagRegex)?.map(tag => tag.slice(1)) || [])]
    
    if (tags.length > 0) {
      const tagSection = {
        id: 'tags',
        title: 'Tags',
        type: 'tags',
        level: 0,
        children: tags.map(tag => ({
          id: `tag-${tag}`,
          title: tag,
          type: 'tag',
          level: 1,
          icon: Hash
        }))
      }
      sections.push(tagSection)
    }

    setOutline(sections)
  }

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const isExpanded = (sectionId) => expandedSections.has(sectionId)

  const handleItemClick = (item) => {
    setActiveSection(item.id)
    // Scroll to the corresponding element in the content
    if (item.type.startsWith('h')) {
      // Find the heading in the content and scroll to it
      const headingElements = document.querySelectorAll(`h${item.type.slice(1)}`)
      const targetHeading = Array.from(headingElements).find(el => 
        el.textContent.trim() === item.title
      )
      if (targetHeading) {
        targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const renderItem = (item, depth = 0) => {
    const Icon = item.icon || Hash
    const isActive = activeSection === item.id
    const hasChildren = item.children && item.children.length > 0
    const expanded = isExpanded(item.id)

    return (
      <div key={item.id} style={{ paddingLeft: `${depth * 16}px` }}>
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-colors ${
            isActive 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id)
            } else {
              handleItemClick(item)
            }
          }}
        >
          {hasChildren && (
            <button className="flex-shrink-0">
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          <Icon className="h-3 w-3 flex-shrink-0" />
          <span className="text-sm truncate">{item.title}</span>
        </div>
        
        {hasChildren && expanded && (
          <div className="mt-1">
            {item.children.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (outline.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <Hash className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No outline available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 px-2 py-2">
        <Hash className="h-4 w-4 text-gray-500" />
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
          Document Outline
        </h4>
      </div>
      
      <div className="space-y-1">
        {outline.map(section => renderItem(section))}
      </div>
    </div>
  )
}

export default SmartOutliner
