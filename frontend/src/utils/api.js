import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth headers if needed
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed in the future
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// API endpoints
export const booksAPI = {
  // Get all books
  getAll: (params = {}) => api.get('/books/', { params }),
  
  // Get single book
  getById: (id) => api.get(`/books/${id}/`),
  
  // Create book
  create: (data) => api.post('/books/', data),
  
  // Update book
  update: (id, data) => api.patch(`/books/${id}/`, data),
  
  // Delete book
  delete: (id) => api.delete(`/books/${id}/`),
  
  // Lookup book by ISBN
  lookup: (data) => api.post('/books/lookup/', data),
  
  // Ingest book by ISBN
  ingest: (data) => api.post('/books/ingest/', data),
  
  // Search for cover images
  searchCovers: (data) => api.post('/books/search_covers/', data),
  
  // Categorize book
  categorize: (data) => api.post('/books/categorize/', data),
}

export const tagsAPI = {
  // Get all tags
  getAll: (params = {}) => api.get('/tags/', { params }),
  
  // Get single tag
  getById: (id) => api.get(`/tags/${id}/`),
  
  // Create tag
  create: (data) => api.post('/tags/', data),
  
  // Update tag
  update: (id, data) => api.patch(`/tags/${id}/`, data),
  
  // Delete tag
  delete: (id) => api.delete(`/tags/${id}/`),
}

export const librariesAPI = {
  // Get all libraries
  getAll: () => api.get('/libraries/'),
  
  // Get single library
  getById: (id) => api.get(`/libraries/${id}/`),
  
  // Create library
  create: (data) => api.post('/libraries/', data),
  
  // Update library
  update: (id, data) => api.patch(`/libraries/${id}/`, data),
  
  // Delete library
  delete: (id) => api.delete(`/libraries/${id}/`),
  
  // Add book to library
  addBook: (libraryId, bookId) => api.post(`/libraries/${libraryId}/books/`, { book_id: bookId }),
  
  // Get books in library
  getBooks: (libraryId, params = {}) => api.get('/library-books/', { params: { library_id: libraryId, ...params } }),
  
  // Remove book from library
  removeBook: (libraryBookId) => api.delete(`/library-books/${libraryBookId}/`),
  
  // Export library
  export: (libraryId) => api.get(`/libraries/${libraryId}/export/`, {
    responseType: 'blob'
  }),
  
  // Import library
  import: (data, config = {}) => api.post('/libraries/import_library/', data, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // Mass operations for individual libraries
  massAddBooks: (libraryId, bookIds) => api.post(`/libraries/${libraryId}/mass_add_books/`, { book_ids: bookIds }),
  
  massRemoveBooks: (libraryId, bookIds, moveToUnassigned = true) => api.post(`/libraries/${libraryId}/mass_remove_books/`, { 
    book_ids: bookIds, 
    move_to_unassigned: moveToUnassigned 
  }),
  
  massMoveBooks: (libraryId, targetLibraryId, bookIds) => api.post(`/libraries/${libraryId}/mass_move_books/`, { 
    target_library_id: targetLibraryId, 
    book_ids: bookIds 
  }),
  
  // Global mass operations
  massOperations: (operationType, data) => api.post('/libraries/mass_operations/', {
    operation_type: operationType,
    ...data
  }),
}

export const libraryBooksAPI = {
  // Get all library books
  getAll: (params = {}) => api.get('/library-books/', { params }),
  
  // Get single library book
  getById: (id) => api.get(`/library-books/${id}/`),
  
  // Add tag to library book
  addTag: (id, tagName) => api.post(`/library-books/${id}/add_tag/`, { tag_name: tagName }),
  
  // Remove tag from library book
  removeTag: (id, tagName) => api.post(`/library-books/${id}/remove_tag/`, { tag_name: tagName }),
  
  // Add to shelf
  addToShelf: (id, shelfName) => api.post(`/library-books/${id}/add_to_shelf/`, { shelf_name: shelfName }),
  
  // Remove from shelf
  removeFromShelf: (id, shelfName) => api.post(`/library-books/${id}/remove_from_shelf/`, { shelf_name: shelfName }),
  
  // Remove book from library (moves to unassigned if not in other libraries)
  removeFromLibrary: (id) => api.post(`/library-books/${id}/remove_from_library/`),
  
  // Permanently delete book from application
  deleteForever: (id) => api.delete(`/library-books/${id}/delete_forever/`),
}

export const notesAPI = {
  // Get all notes
  getAll: (params = {}) => api.get('/notes/', { params }),
  
  // Get single note
  getById: (id) => api.get(`/notes/${id}/`),
  
  // Get notes for library book
  getByLibraryBook: (libraryBookId) => api.get('/notes/', { params: { library_book_id: libraryBookId } }),
  
  // Create note
  create: (data) => api.post('/notes/', data),
  
  // Update note
  update: (id, data) => api.patch(`/notes/${id}/`, data),
  
  // Delete note
  delete: (id) => api.delete(`/notes/${id}/`),
  
  // AI assistance
  aiAssist: (noteId, data) => api.post(`/notes/${noteId}/ai_assist/`, data),
  
  // Search notes
  search: (params = {}) => api.get('/notes/search/', { params }),
}

export const diagramsAPI = {
  // Get all diagrams
  getAll: (params = {}) => api.get('/diagrams/', { params }),
  
  // Get single diagram
  getById: (id) => api.get(`/diagrams/${id}/`),
  
  // Create diagram
  create: (data) => api.post('/diagrams/', data),
  
  // Update diagram
  update: (id, data) => api.patch(`/diagrams/${id}/`, data),
  
  // Delete diagram
  delete: (id) => api.delete(`/diagrams/${id}/`),
  
  // Update diagram preview
  updatePreview: (id, data) => api.post(`/diagrams/${id}/update_preview/`, data),
}

export const noteDiagramsAPI = {
  // Get note diagrams
  getByNote: (noteId) => api.get('/note-diagrams/', { params: { note_id: noteId } }),
  
  // Create note diagram
  create: (data) => api.post('/note-diagrams/', data),
  
  // Delete note diagram
  delete: (id) => api.delete(`/note-diagrams/${id}/`),
}

export const ratingsAPI = {
  // Get all ratings
  getAll: (params = {}) => api.get('/ratings/', { params }),
  
  // Get single rating
  getById: (id) => api.get(`/ratings/${id}/`),
  
  // Get ratings for library book
  getByLibraryBook: (libraryBookId) => api.get('/ratings/', { params: { library_book_id: libraryBookId } }),
  
  // Create rating
  create: (data) => api.post('/ratings/', data),
  
  // Update rating
  update: (id, data) => api.patch(`/ratings/${id}/`, data),
  
  // Delete rating
  delete: (id) => api.delete(`/ratings/${id}/`),
  
  // Get rating summary
  summary: (libraryBookId) => api.get('/ratings/summary/', { params: { library_book_id: libraryBookId } }),
  

}

export const reviewsAPI = {
  // Get reviews for library book
  getByLibraryBook: (libraryBookId) => api.get('/reviews/', { params: { library_book_id: libraryBookId } }),
  
  // Create review
  create: (data) => api.post('/reviews/', data),
  
  // Update review
  update: (id, data) => api.patch(`/reviews/${id}/`, data),
  
  // Delete review
  delete: (id) => api.delete(`/reviews/${id}/`),
}

export const shelvesAPI = {
  // Get all shelves
  getAll: () => api.get('/shelves/'),
  
  // Get single shelf
  getById: (id) => api.get(`/shelves/${id}/`),
  
  // Create shelf
  create: (data) => api.post('/shelves/', data),
  
  // Update shelf
  update: (id, data) => api.patch(`/shelves/${id}/`, data),
  
  // Delete shelf
  delete: (id) => api.delete(`/shelves/${id}/`),
  
  // Get system shelves
  getSystemShelves: () => api.get('/shelves/system_shelves/'),
  
  // Get custom shelves
  getCustomShelves: () => api.get('/shelves/custom_shelves/'),
  
  // Add book to shelf
  addBookToShelf: (shelfId, data) => api.post(`/shelves/${shelfId}/add_book/`, data),
  
  // Remove book from shelf
  removeBookFromShelf: (shelfId, data) => api.delete(`/shelves/${shelfId}/remove_book/`, { data }),
  
  // Get books on shelf
  getShelfBooks: (shelfId) => api.get(`/shelves/${shelfId}/books/`),
}

export const filesAPI = {
  // Get all files
  getAll: (params = {}) => api.get('/files/', { params }),
  
  // Get single file
  getById: (id) => api.get(`/files/${id}/`),
  
  // Get files by library book
  getByLibraryBook: (libraryBookId) => api.get('/files/', { params: { library_book_id: libraryBookId } }),
  
  // Create file (upload)
  create: (data, config = {}) => api.post('/files/', data, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // Update file
  update: (id, data) => api.patch(`/files/${id}/`, data),
  
  // Delete file
  delete: (id) => api.delete(`/files/${id}/`),
  
  // Extract text from PDF
  extractText: (id) => api.post(`/files/${id}/extract_text/`),
}

export const pdfHighlightsAPI = {
  // Get all highlights
  getAll: (params = {}) => api.get('/pdf-highlights/', { params }),
  
  // Get single highlight
  getById: (id) => api.get(`/pdf-highlights/${id}/`),
  
  // Get highlights by book file
  getByBookFile: (bookFileId) => api.get('/pdf-highlights/', { params: { book_file_id: bookFileId } }),
  
  // Create highlight
  create: (data) => api.post('/pdf-highlights/', data),
  
  // Update highlight
  update: (id, data) => api.patch(`/pdf-highlights/${id}/`, data),
  
  // Delete highlight
  delete: (id) => api.delete(`/pdf-highlights/${id}/`),
}

export const searchAPI = {
  // Basic search
  basic: (query, params = {}) => api.get('/search/basic/', { params: { q: query, ...params } }),
  
  // Semantic search
  semantic: (data) => api.post('/search/semantic/', data),
  
  // Search status
  status: () => api.get('/search/status/'),
  
  // Recommendations
  recommendations: (libraryBookId, limit = 5) => api.get('/search/recommendations/', { 
    params: { library_book_id: libraryBookId, limit } 
  }),
}

export default api
