# Obvia — Personal Intelligent Library Manager

A minimal, single-user app to manage a personal book library with ISBN lookup (including barcode scan), enriched metadata, intelligent notes, basic + semantic search, and simple recommendations.

## Features

- 📚 **Book Management**: Add books via ISBN lookup or barcode scanning
- 📷 **Bulk Scanning**: Live webcam barcode scanning with automatic import and audio feedback
- 🔍 **Metadata Enrichment**: Automatic data fetching from Google Books and Open Library APIs
- 📝 **Intelligent Notes**: Markdown-based note-taking with AI assistance
- 🔎 **Search**: Basic search (title/author/ISBN) and semantic search across metadata/notes/PDF text
- 📊 **Recommendations**: Book recommendations based on metadata similarity
- 📁 **File Management**: Upload and extract text from PDFs
- 🏷️ **Organization**: Tags, shelves, and ratings for book organization
- 🎨 **Modern UI**: Sleek, monochrome interface with dark/light mode

## Tech Stack

- **Backend**: Python 3.11, Django 5, Django REST Framework, MySQL 8
- **Frontend**: React 18 (Vite), Tailwind CSS
- **Packaging**: Docker (multi-stage) + docker-compose
- **Style**: Sleek, modern, monochrome (grays/black/white), dark/light

## Prerequisites

- Docker and Docker Compose
- Git

## Quick Start

### Option 1: Using Scripts (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd obvia
   ```

2. **Run the development script**:
   ```bash
   ./scripts/dev.sh
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/api/docs/

### Option 2: Manual Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd obvia
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Start the application**:
   ```bash
   docker compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173 (development) or http://localhost:80 (production)
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/api/docs/

## Environment Configuration

Copy `.env.example` to `.env` and configure the following variables:

### Database
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DB`, `MYSQL_USER`, `MYSQL_PASSWORD`: MySQL connection settings

### External APIs
- `GOOGLE_BOOKS_ENABLED`: Enable Google Books API (default: true)
- `OPEN_LIBRARY_ENABLED`: Enable Open Library API (default: true)
- `GOOGLE_BOOKS_API_KEY`: Optional API key for Google Books (increases rate limits)

### AI Features (Optional)
- `AI_PROVIDER`: Set to `openai`, `local`, or `disabled` (default: disabled)
- `OPENAI_API_KEY`: Required if using OpenAI for semantic search

### Storage
- `MEDIA_ROOT`: Local file storage path
- `USE_OBJECT_STORAGE`: Enable MinIO object storage (default: false)

## API Endpoints

### Libraries
- `GET /api/libraries/` - List all libraries
- `POST /api/libraries/` - Create a new library
- `PATCH /api/libraries/{id}` - Update library
- `DELETE /api/libraries/{id}` - Delete library

### Books
- `GET /api/books/` - List all books
- `POST /api/books/` - Create a new book manually
- `GET /api/books/{id}/` - Get book details
- `PATCH /api/books/{id}/` - Update book
- `DELETE /api/books/{id}/` - Delete book
- `POST /api/books/lookup/` - Lookup book by ISBN (no save, uses external APIs)
- `POST /api/books/ingest/` - Create book from ISBN with metadata enrichment
- `POST /api/libraries/{libraryId}/books/` - Add book to library
- `GET /api/libraries/{libraryId}/books/` - List books in library
- `DELETE /api/libraries/{libraryId}/books/{libraryBookId}/` - Remove book from library

### Search
- `GET /api/search/basic?q=...&library_id=...&author=...&tag=...&rating=...&shelf=...` - Enhanced basic search with filters
- `POST /api/search/semantic` - Semantic search using embeddings (requires AI_PROVIDER)
- `GET /api/search/status` - Check semantic search status and configuration
- `GET /api/search/recommendations?library_book_id=...&limit=...` - Book recommendations based on metadata similarity

### Notes & Reviews
- `GET /api/notes/` - List all notes
- `GET /api/notes/{id}/` - Get note details
- `POST /api/notes/` - Create note
- `PATCH /api/notes/{id}/` - Update note
- `DELETE /api/notes/{id}/` - Delete note
- `POST /api/notes/{id}/ai_assist/` - AI assistance for note enhancement

### Ratings
- `GET /api/ratings/` - List all ratings
- `GET /api/ratings/{id}/` - Get rating details
- `POST /api/ratings/` - Create rating
- `PATCH /api/ratings/{id}/` - Update rating
- `DELETE /api/ratings/{id}/` - Delete rating
- `GET /api/ratings/summary/` - Get rating summary for a book
- `POST /api/ratings/category/` - Set category-specific rating

### Shelves
- `GET /api/shelves/` - List all shelves
- `GET /api/shelves/{id}/` - Get shelf details
- `POST /api/shelves/` - Create shelf
- `PATCH /api/shelves/{id}/` - Update shelf
- `DELETE /api/shelves/{id}/` - Delete shelf
- `GET /api/shelves/system/` - Get system shelves (wishlist, reading, finished)
- `GET /api/shelves/custom/` - Get custom shelves
- `POST /api/shelves/{id}/add_book/` - Add book to shelf
- `DELETE /api/shelves/{id}/remove_book/` - Remove book from shelf
- `GET /api/shelves/{id}/books/` - Get books on shelf

### Files
- `GET /api/files/` - List all files
- `GET /api/files/{id}/` - Get file details
- `POST /api/files/` - Upload file (multipart/form-data)
- `PATCH /api/files/{id}/` - Update file
- `DELETE /api/files/{id}/` - Delete file
- `POST /api/files/{id}/extract_text/` - Extract text from PDF file

## Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Management
```bash
# Apply migrations
docker compose exec backend python manage.py migrate

# Create superuser (if needed)
docker compose exec backend python manage.py createsuperuser

# Seed example books with metadata enrichment
docker compose exec backend python manage.py seed_books --create-library

# Extract text from existing PDF files
docker compose exec backend python manage.py extract_pdf_text

# Create embeddings for semantic search
docker compose exec backend python manage.py create_embeddings

# Create system shelves (wishlist, reading, finished)
docker compose exec backend python manage.py create_system_shelves

# Reset database
docker compose down -v
docker compose up --build

## Testing

### Backend Tests
Run the backend tests using the test settings:
```bash
# Run all tests
docker compose exec backend python manage.py test --settings=obvia_core.test_settings

# Run specific test files
docker compose exec backend python manage.py test --settings=obvia_core.test_settings books.test_simple
docker compose exec backend python manage.py test --settings=obvia_core.test_settings search.test_simple
```

### Frontend Tests
The frontend includes basic functionality tests that run during the build process.

### Manual Testing
Use the comprehensive manual runbook for end-to-end testing:
```bash
# Follow the manual runbook
cat MANUAL_RUNBOOK.md
```

The manual runbook covers:
- Basic setup and navigation
- Library management
- Book addition (barcode scan)
- Book management
- Tags and shelves
- Ratings and reviews
- Notes and AI assist
- File upload and PDF text extraction
- Search functionality
- Recommendations
- Semantic search (if enabled)
- Error handling
- Performance and responsiveness
- Data persistence
- Accessibility

## Scripts

The project includes several useful scripts for development and deployment:

### Development Scripts

- **`./scripts/dev.sh`** - Complete development setup
  - Checks prerequisites (Docker, Docker Compose)
  - Creates .env file if missing
  - Starts all services with health checks
  - Provides helpful commands and URLs

- **`./scripts/deploy.sh`** - Production deployment
  - Full production deployment with health checks
  - Runs migrations and creates system shelves
  - Includes monitoring commands

### Backup & Restore Scripts

- **`./scripts/backup.sh`** - Create backups
  - Backs up database and media files
  - Creates timestamped backup files
  - Generates backup information file

- **`./scripts/restore.sh <db_file> <media_file>`** - Restore from backup
  - Restores database and media files
  - Includes safety confirmations
  - Runs post-restore setup

### Example Usage

```bash
# Development setup
./scripts/dev.sh

# Production deployment
./scripts/deploy.sh

# Create backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh ./backups/obvia_db_20241201_143022.sql ./backups/obvia_media_20241201_143022.tar.gz
```
```

## Troubleshooting

### Port Conflicts
If ports 3306, 6379, 8000, or 5173 are already in use, modify the ports in `docker-compose.yml`.

### Camera Access (Barcode Scanner)
The barcode scanner requires camera permissions. If denied, the app will fall back to manual ISBN input.

### Database Connection Issues
Ensure MySQL container is healthy before starting the backend:
```bash
docker compose logs mysql
```

### File Upload Issues
Check that the media volume is properly mounted and has write permissions.

### Service Health Issues
Check service health status:
```bash
docker compose ps
```

View service logs:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
```

### Performance Issues
Monitor resource usage:
```bash
docker stats
```

### Backup Issues
If backup fails, ensure services are running:
```bash
docker compose ps
```

### Restore Issues
If restore fails, check backup file integrity:
```bash
ls -la backups/
```

### AI Features Not Working
Ensure AI_PROVIDER is configured in .env:
```bash
# For OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key

# For local fallback
AI_PROVIDER=local

# To disable
AI_PROVIDER=disabled
```

## Production Deployment

### Using Deployment Script (Recommended)
```bash
./scripts/deploy.sh
```

### Manual Production Setup

1. **Configure environment for production**:
   ```bash
   cp .env.example .env
   # Edit .env with production settings
   # Set DEBUG=false
   # Configure proper SECRET_KEY
   # Set up external database if needed
   ```

2. **Deploy with Docker Compose**:
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```

3. **Run post-deployment setup**:
   ```bash
   docker compose exec backend python manage.py migrate
   docker compose exec backend python manage.py create_system_shelves
   docker compose exec backend python manage.py createsuperuser
   ```

### Production Considerations

- **Security**: Set `DEBUG=false` and use a strong `SECRET_KEY`
- **Database**: Consider using external MySQL/PostgreSQL for production
- **Media Storage**: Use external storage (S3, MinIO) for media files
- **Backup**: Set up regular backups using `./scripts/backup.sh`
- **Monitoring**: Use Docker health checks and monitoring tools
- **SSL**: Configure reverse proxy with SSL termination

### Environment Variables for Production

```bash
# Required
DEBUG=false
SECRET_KEY=your-very-secure-secret-key
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database (if using external)
MYSQL_HOST=your-db-host
MYSQL_USER=your-db-user
MYSQL_PASSWORD=your-db-password

# AI Features (optional)
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-key

# External APIs (optional)
GOOGLE_BOOKS_API_KEY=your-google-books-key
```

## Privacy & Security

⚠️ **Important**: This application is designed for local/private use. Only upload PDFs that you have the rights to use. The application stores data locally and does not share it with third parties.

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]