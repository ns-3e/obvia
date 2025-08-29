# Frontend Components Interface

## Purpose
The frontend components provide the user interface for Preposition, delivering a modern, responsive, and accessible experience for managing personal libraries. Components are built with React 18, use Tailwind CSS for styling, and follow a monochrome design system.

## Component Architecture

### Core Components

#### Header
**Purpose**: Global navigation and application controls
**Responsibilities**:
- Global search functionality
- Theme toggle (dark/light mode)
- Navigation between main sections
- Bulk scan access
- User feedback and notifications

**Props**:
```javascript
{
  onSearch: (query) => void,
  onThemeToggle: () => void,
  onBulkScan: () => void
}
```

**Key Features**:
- Responsive design for mobile and desktop
- Keyboard navigation support
- Search with autocomplete
- Theme persistence in localStorage

#### BookCard
**Purpose**: Display book information in grid and list views
**Responsibilities**:
- Book cover display with fallback
- Book metadata presentation
- Action buttons (edit, delete, add to shelf)
- Tag and rating display
- Responsive layout adaptation

**Props**:
```javascript
{
  book: {
    id: string,
    title: string,
    authors: string[],
    cover_url: string,
    rating: number,
    tags: string[],
    shelves: string[]
  },
  onEdit: (bookId) => void,
  onDelete: (bookId) => void,
  onAddToShelf: (bookId, shelfId) => void,
  variant: 'grid' | 'list'
}
```

**Key Features**:
- Image lazy loading and error handling
- Hover effects and animations
- Accessibility labels and keyboard support
- Responsive image sizing

#### BarcodeScanner
**Purpose**: Real-time barcode scanning for book addition
**Responsibilities**:
- Camera access and stream management
- Barcode detection and validation
- ISBN normalization and validation
- User feedback and error handling
- Fallback to manual input

**Props**:
```javascript
{
  onScan: (isbn) => void,
  onError: (error) => void,
  onClose: () => void,
  isOpen: boolean
}
```

**Key Features**:
- Support for ISBN-10, ISBN-13, and UPC-A
- Real-time video preview
- Audio feedback for successful scans
- Camera permission handling
- Mobile-optimized interface

### Page Components

#### Dashboard
**Purpose**: Main application landing page
**Responsibilities**:
- Library overview and statistics
- Global search interface
- Quick actions and shortcuts
- Recent activity display
- System status and notifications

**State Management**:
```javascript
{
  libraries: Library[],
  searchQuery: string,
  recentBooks: Book[],
  isLoading: boolean,
  error: string | null
}
```

**Key Features**:
- Library cards with book counts
- Global search with filters
- Quick add book functionality
- Responsive grid layout
- Loading states and error handling

#### LibraryDetail
**Purpose**: Library-specific book management
**Responsibilities**:
- Display books in library
- Filtering and sorting options
- Bulk operations
- Library metadata management
- Navigation to book details

**Props**:
```javascript
{
  libraryId: string,
  onBookSelect: (bookId) => void,
  onAddBook: () => void
}
```

**Key Features**:
- Grid and list view options
- Advanced filtering (tags, ratings, shelves)
- Search within library
- Bulk selection and operations
- Pagination for large libraries

#### BookDetail
**Purpose**: Comprehensive book information and management
**Responsibilities**:
- Complete book metadata display
- Notes and reviews management
- File upload and management
- Rating and shelf management
- AI assistance integration

**Props**:
```javascript
{
  bookId: string,
  libraryId: string,
  onBack: () => void,
  onEdit: (bookId) => void
}
```

**Key Features**:
- Tabbed interface (Overview, Notes, Files, AI)
- Markdown note editor
- File upload with progress
- Rating and review system
- AI-powered note assistance

#### BulkScan
**Purpose**: Advanced bulk barcode scanning interface
**Responsibilities**:
- Live camera scanning with queue management
- Automatic book import and metadata enrichment
- Real-time feedback and status tracking
- Session management and export
- Error handling and retry mechanisms

**State Management**:
```javascript
{
  isScanning: boolean,
  targetLibrary: string,
  scannedBooks: ScannedBook[],
  statistics: {
    scanned: number,
    imported: number,
    skipped: number,
    errors: number
  },
  cameraStream: MediaStream | null
}
```

**Key Features**:
- Real-time barcode detection
- Queue management with status tracking
- CSV export functionality
- Audio and visual feedback
- Offline resilience and retry logic

### Feature Components

#### SemanticSearchPanel
**Purpose**: AI-powered semantic search interface
**Responsibilities**:
- Query input and processing
- Search result display
- Result filtering and sorting
- Search history management
- AI provider status display

**Props**:
```javascript
{
  onSearch: (query, options) => void,
  results: SearchResult[],
  isLoading: boolean,
  isEnabled: boolean
}
```

**Key Features**:
- Natural language query processing
- Result relevance scoring
- Search result categorization
- Query suggestions and autocomplete
- Search analytics and insights

#### RecommendationCarousel
**Purpose**: Display book recommendations
**Responsibilities**:
- Recommendation algorithm integration
- Carousel navigation and controls
- Book preview and quick actions
- Recommendation feedback collection
- Personalized recommendation display

**Props**:
```javascript
{
  recommendations: Book[],
  onBookSelect: (bookId) => void,
  onFeedback: (bookId, feedback) => void,
  source: 'similarity' | 'collaborative' | 'ai'
}
```

**Key Features**:
- Smooth carousel navigation
- Recommendation explanations
- Feedback collection for algorithm improvement
- Responsive design for mobile
- Loading states and error handling

#### NotesEditor
**Purpose**: Markdown-based note editing with AI assistance
**Responsibilities**:
- Markdown editing and preview
- AI-powered note enhancement
- Note organization and tagging
- Auto-save and version history
- Export and sharing capabilities

**Props**:
```javascript
{
  content: string,
  onChange: (content) => void,
  onSave: (content) => void,
  onAiAssist: (prompt) => void,
  isAiEnabled: boolean
}
```

**Key Features**:
- Real-time markdown preview
- Syntax highlighting
- AI assistance integration
- Auto-save functionality
- Keyboard shortcuts and toolbar

## Design System

### Color Palette
- **Primary**: Monochrome (grays, black, white)
- **Accent**: Subtle blue for interactive elements
- **Success**: Green for positive actions
- **Warning**: Yellow for caution states
- **Error**: Red for error states

### Typography
- **Font Family**: System fonts with fallbacks
- **Headings**: Bold weights for hierarchy
- **Body**: Regular weight for readability
- **Code**: Monospace for technical content

### Spacing
- **Base Unit**: 4px (0.25rem)
- **Spacing Scale**: 4, 8, 12, 16, 20, 24, 32, 48, 64px
- **Container Max Width**: 1200px
- **Border Radius**: 8px (0.5rem) for cards, 4px (0.25rem) for inputs

### Responsive Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## State Management

### Context API Usage
- **ThemeContext**: Dark/light mode state
- **AuthContext**: User authentication (single-user)
- **LibraryContext**: Current library selection
- **SearchContext**: Global search state

### Local State Patterns
- **Form State**: Controlled components with validation
- **Loading States**: Skeleton loaders and spinners
- **Error States**: User-friendly error messages
- **Optimistic Updates**: Immediate UI feedback

## API Integration

### API Client
```javascript
// utils/api.js
const api = {
  books: {
    list: (params) => fetch('/api/books/', { params }),
    create: (data) => fetch('/api/books/', { method: 'POST', body: data }),
    update: (id, data) => fetch(`/api/books/${id}/`, { method: 'PATCH', body: data }),
    delete: (id) => fetch(`/api/books/${id}/`, { method: 'DELETE' })
  },
  libraries: {
    list: () => fetch('/api/libraries/'),
    create: (data) => fetch('/api/libraries/', { method: 'POST', body: data }),
    books: (id, params) => fetch(`/api/libraries/${id}/books/`, { params })
  }
}
```

### Error Handling
- **Network Errors**: Retry with exponential backoff
- **Validation Errors**: Display field-specific messages
- **Server Errors**: Generic error messages with logging
- **Timeout Errors**: User-friendly timeout messages

## Performance Optimization

### Code Splitting
- **Route-based**: Lazy load page components
- **Component-based**: Lazy load heavy components
- **Library-based**: Dynamic imports for large libraries

### Image Optimization
- **Lazy Loading**: Intersection Observer for images
- **Progressive Loading**: Blur placeholders
- **Responsive Images**: Multiple sizes for different screens
- **Caching**: Browser cache and service worker

### Bundle Optimization
- **Tree Shaking**: Remove unused code
- **Minification**: Compress JavaScript and CSS
- **Gzip Compression**: Reduce transfer sizes
- **CDN**: Static asset delivery

## Accessibility

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: Minimum 4.5:1 ratio
- **Focus Management**: Visible focus indicators

### Best Practices
- **Semantic HTML**: Proper heading hierarchy
- **Alt Text**: Descriptive image alternatives
- **Form Labels**: Associated labels for all inputs
- **Error Messages**: Clear and helpful error descriptions

## Testing Strategy

### Unit Testing
- **Component Testing**: React Testing Library
- **Hook Testing**: Custom hook testing utilities
- **Utility Testing**: Pure function testing
- **Mock Testing**: API and external dependency mocking

### Integration Testing
- **User Flows**: End-to-end user journeys
- **API Integration**: Backend communication testing
- **State Management**: Context and state updates
- **Error Scenarios**: Error handling and recovery

### Visual Testing
- **Screenshot Testing**: Visual regression testing
- **Responsive Testing**: Cross-device compatibility
- **Accessibility Testing**: Automated accessibility checks
- **Performance Testing**: Load time and bundle size

## Current State
- ✅ Core components implemented
- ✅ Responsive design working
- ✅ Theme system functional
- ✅ API integration complete
- ✅ Accessibility features implemented
- ✅ Performance optimizations applied
- ✅ Testing framework established

## Future Enhancements
- **PWA Features**: Service worker and offline support
- **Advanced Animations**: Micro-interactions and transitions
- **Mobile App**: React Native or Capacitor integration
- **Advanced Search**: Elasticsearch integration
- **Real-time Updates**: WebSocket integration
- **Advanced Analytics**: User behavior tracking
