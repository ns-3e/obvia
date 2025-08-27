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
  
  // Create book manually
  create: (data) => api.post('/books/', data),
  
  // Update book
  update: (id, data) => api.patch(`/books/${id}/`, data),
  
  // Delete book
  delete: (id) => api.delete(`/books/${id}/`),
  
  // Lookup book by ISBN (no save)
  lookup: (isbn) => api.post('/books/lookup/', { isbn }),
  
  // Ingest book by ISBN (create with metadata)
  ingest: (isbn) => api.post('/books/ingest/', { isbn }),
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
  
  // Set category rating
  categoryRating: (data) => api.post('/ratings/category/', data),
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

export const tagsAPI = {
  // Get all tags
  getAll: () => api.get('/tags/'),
  
  // Create tag
  create: (data) => api.post('/tags/', data),
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
  getSystemShelves: () => api.get('/shelves/system/'),
  
  // Get custom shelves
  getCustomShelves: () => api.get('/shelves/custom/'),
  
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
