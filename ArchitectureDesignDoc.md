# Obvia — Architecture Design Document

## Purpose & Vision

Obvia is an intelligent personal library manager designed for single-user operation. It provides a comprehensive solution for managing personal book collections with advanced features like barcode scanning, metadata enrichment, intelligent notes, semantic search, and AI-assisted recommendations.

### Core Philosophy
- **Single-user focused**: No authentication complexity, designed for personal use
- **Privacy-first**: Local data storage, no external data sharing
- **Intelligent automation**: AI-powered features for enhanced book management
- **Modern UX**: Sleek, responsive interface with dark/light themes
- **Open architecture**: Modular design for easy extension and maintenance

## Technology Stack

### Backend Architecture
- **Framework**: Django 5 with Django REST Framework
- **Database**: MySQL 8 (with SQLite fallback for development)
- **Language**: Python 3.11
- **AI Integration**: OpenAI API (optional) for semantic search and note assistance
- **File Processing**: PDF text extraction with PyPDF
- **External APIs**: Google Books API, Open Library API for metadata enrichment

### Frontend Architecture
- **Framework**: React 18 with Vite build system
- **Styling**: Tailwind CSS with custom monochrome design system
- **State Management**: React Context API for theme management
- **Barcode Scanning**: @zxing/browser for real-time camera scanning
- **UI Components**: Custom components with accessibility focus

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **Web Server**: Nginx for frontend serving, Gunicorn for backend
- **Storage**: Local file system with optional MinIO object storage

## Module Architecture

### Backend Modules (Django Apps)

#### 1. `books` - Core Book Management
**Purpose**: Central book data model and metadata management
**Responsibilities**:
- Book entity management (ISBN, title, author, publisher, etc.)
- Author relationship management
- Metadata normalization and validation
- Book lookup and ingestion workflows

**Key Models**:
- `Book`: Core book entity with normalized metadata
- `Author`: Author information with many-to-many relationships
- `Tag`: Flexible tagging system for book categorization

**API Endpoints**:
- `POST /api/books/lookup` - External API lookup without saving
- `POST /api/books/ingest` - Create book with metadata enrichment
- `GET/PATCH/DELETE /api/books/{id}` - CRUD operations

#### 2. `libraries` - Library Organization
**Purpose**: User library management and book organization
**Responsibilities**:
- Library creation and management
- Book-to-library relationships
- System shelves (wishlist, reading, finished)
- Library-specific book metadata

**Key Models**:
- `Library`: User-created library collections
- `LibraryBook`: Junction table with library-specific data
- `Shelf`: Book organization within libraries

**API Endpoints**:
- `GET/POST/PATCH/DELETE /api/libraries/` - Library CRUD
- `POST /api/libraries/{id}/books/` - Add books to library
- `GET /api/libraries/{id}/books/` - List library books with filters

#### 3. `notes` - Intelligent Note-Taking
**Purpose**: AI-enhanced note-taking and review system
**Responsibilities**:
- Markdown-based note creation and editing
- AI-assisted note enhancement
- Review and rating management
- Note-to-book relationships

**Key Models**:
- `Note`: Markdown notes with AI generation tracking
- `Rating`: Book ratings with category support
- `Review`: Extended book reviews

**API Endpoints**:
- `GET/POST/PATCH/DELETE /api/notes/` - Note CRUD
- `POST /api/notes/{id}/ai_assist/` - AI note assistance
- `GET/POST/PATCH/DELETE /api/ratings/` - Rating management

#### 4. `files` - File Management
**Purpose**: PDF upload and text extraction
**Responsibilities**:
- File upload and validation
- PDF text extraction
- File metadata management
- Storage abstraction (local/object storage)

**Key Models**:
- `BookFile`: File metadata and storage information
- Extracted text storage for search integration

**API Endpoints**:
- `POST /api/files/` - File upload
- `POST /api/files/{id}/extract_text/` - Text extraction
- `GET/DELETE /api/files/{id}/` - File management

#### 5. `search` - Intelligent Search
**Purpose**: Basic and semantic search capabilities
**Responsibilities**:
- Basic text search across book metadata
- Semantic search using embeddings
- Search result ranking and filtering
- Embedding generation and storage

**Key Models**:
- `SearchEmbedding`: Vector embeddings for semantic search

**API Endpoints**:
- `GET /api/search/basic` - Basic search with filters
- `POST /api/search/semantic` - Semantic search
- `GET /api/search/recommendations` - Book recommendations

#### 6. `ingest` - External Data Integration
**Purpose**: External API integration for metadata enrichment
**Responsibilities**:
- Google Books API integration
- Open Library API integration
- Metadata normalization and fallback logic
- Rate limiting and error handling

**Key Components**:
- `GoogleBooksClient`: Google Books API wrapper
- `OpenLibraryClient`: Open Library API wrapper
- Metadata normalization utilities

### Frontend Modules

#### 1. Core Components
- **Header**: Global navigation, search, theme toggle
- **BookCard**: Book display with cover, metadata, actions
- **BarcodeScanner**: Real-time camera scanning with fallback
- **NotesEditor**: Markdown editor with AI assistance

#### 2. Page Components
- **Dashboard**: Library overview and global search
- **LibraryDetail**: Library-specific book management
- **BookDetail**: Comprehensive book information and actions
- **BulkScan**: Advanced barcode scanning interface

#### 3. Feature Components
- **SemanticSearchPanel**: AI-powered search interface
- **RecommendationCarousel**: Book recommendation display
- **RatingPanel**: Rating and review management
- **ShelfManager**: Book organization tools

## Development Flow

### Phase-Based Development
The project follows a structured phase-based development approach:

1. **Phase 0**: Repository scaffolding and basic setup
2. **Phase 1**: Core backend models and API endpoints
3. **Phase 2**: External API integration for metadata
4. **Phase 3**: Frontend foundation and basic UI
5. **Phase 4**: File management and PDF processing
6. **Phase 5**: Basic search and recommendations
7. **Phase 6**: Semantic search with AI integration
8. **Phase 7**: Notes and AI assistance
9. **Phase 8**: Ratings, shelves, and organization
10. **Phase 9**: Dockerization and deployment
11. **Phase 10**: Testing and documentation
12. **Phase 11**: Bulk scanning and advanced features

### Development Practices
- **Continuous Testing**: Each phase includes comprehensive testing
- **Documentation**: All features documented in README and runbooks
- **Incremental Development**: Features built and tested in logical batches
- **AI Collaboration**: Code structured for easy AI agent understanding

### Code Organization Principles
- **Single Responsibility**: Each module has a clear, focused purpose
- **Dependency Injection**: External services abstracted for easy testing
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Accessibility**: WCAG compliance and keyboard navigation support
- **Performance**: Optimized queries and efficient frontend rendering

## Data Flow Architecture

### Book Ingestion Flow
1. **Input**: ISBN via manual entry or barcode scan
2. **Lookup**: External API calls (Google Books → Open Library fallback)
3. **Normalization**: Data cleaning and standardization
4. **Storage**: Book creation in database
5. **Enrichment**: Optional AI-powered metadata enhancement

### Search Flow
1. **Query**: User input (text or semantic)
2. **Processing**: Query normalization and embedding generation
3. **Search**: Database queries or vector similarity search
4. **Ranking**: Result scoring and relevance ordering
5. **Presentation**: Formatted results with metadata

### File Processing Flow
1. **Upload**: File validation and storage
2. **Extraction**: PDF text extraction using PyPDF
3. **Chunking**: Text segmentation for search indexing
4. **Indexing**: Integration with search system
5. **Cleanup**: Temporary file management

## Security & Privacy

### Data Protection
- **Local Storage**: All data stored locally by default
- **No External Sharing**: No data transmitted to third parties
- **Optional AI**: AI features require explicit user opt-in
- **File Validation**: Strict file type and size validation

### Access Control
- **Single User**: No authentication system (by design)
- **File Permissions**: Proper file system permissions
- **API Rate Limiting**: External API call throttling
- **Input Validation**: Comprehensive input sanitization

## Scalability Considerations

### Performance Optimization
- **Database Indexing**: Strategic indexes for common queries
- **Caching**: Redis integration for search results
- **Lazy Loading**: Frontend component lazy loading
- **Image Optimization**: Book cover compression and caching

### Extension Points
- **Plugin Architecture**: Modular design for feature additions
- **API Versioning**: REST API versioning for future compatibility
- **Storage Abstraction**: Pluggable storage backends
- **AI Provider Abstraction**: Multiple AI service support

## Monitoring & Maintenance

### Health Checks
- **Docker Health Checks**: Container health monitoring
- **API Endpoints**: Health check endpoints for monitoring
- **Database Monitoring**: Connection and query performance
- **File System Monitoring**: Storage capacity and performance

### Backup & Recovery
- **Automated Backups**: Database and file system backups
- **Point-in-Time Recovery**: Database backup restoration
- **Configuration Management**: Environment-specific configurations
- **Deployment Scripts**: Automated deployment and rollback

## Future Roadmap

### Planned Enhancements
- **Mobile App**: Native mobile application
- **Advanced Analytics**: Reading statistics and insights
- **Social Features**: Optional sharing and recommendations
- **Integration APIs**: Third-party service integrations

### Technical Debt
- **Test Coverage**: Comprehensive unit and integration tests
- **Performance Optimization**: Query optimization and caching
- **Documentation**: API documentation and developer guides
- **Code Quality**: Static analysis and linting improvements

---

*This architecture document serves as the foundation for development decisions and provides context for AI agents working on the project. It should be updated as the system evolves.*
