import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, BookOpen, Search, Library } from 'lucide-react'
import { librariesAPI, searchAPI } from '../utils/api'
import BookCard from '../components/BookCard'

const Dashboard = () => {
  const [libraries, setLibraries] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search')

  useEffect(() => {
    loadLibraries()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      performSearch(searchQuery)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const loadLibraries = async () => {
    try {
      setLoading(true)
      const response = await librariesAPI.getAll()
      setLibraries(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to load libraries:', error)
    } finally {
      setLoading(false)
    }
  }

  const performSearch = async (query) => {
    try {
      setSearchLoading(true)
      const response = await searchAPI.basic(query)
      setSearchResults(response.data.results || [])
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading libraries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to Obvia
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your personal intelligent library manager
        </p>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Search Results for "{searchQuery}"
            </h2>
          </div>
          
          {searchLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
                     ) : searchResults.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {searchResults.map((result) => (
                 <div key={result.id} className="card p-4 hover:shadow-lg transition-shadow duration-200">
                   <div className="flex items-start space-x-3">
                     <div className="flex-shrink-0">
                       <div className="w-12 h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                     </div>
                     <div className="flex-1 min-w-0">
                       <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                         {result.title}
                       </h3>
                       <div className="flex items-center space-x-2 mt-1">
                         <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                           {result.type}
                         </span>
                         {result.score && (
                           <span className="text-xs text-gray-500 dark:text-gray-400">
                             Score: {result.score.toFixed(1)}
                           </span>
                         )}
                       </div>
                       {result.authors && result.authors.length > 0 && (
                         <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                           by {result.authors.join(', ')}
                         </p>
                       )}
                       {result.snippet && (
                         <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                           {result.snippet}
                         </p>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No results found for "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Libraries */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Your Libraries
          </h2>
          <Link
            to="/add"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Book</span>
          </Link>
        </div>

        {libraries.length === 0 ? (
          <div className="text-center py-12">
            <Library className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No libraries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first library and start adding books.
            </p>
            <Link
              to="/add"
              className="btn-primary"
            >
              Add Your First Book
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {libraries.map((library) => (
              <Link
                key={library.id}
                to={`/libraries/${library.id}`}
                className="card p-6 hover:shadow-lg transition-shadow duration-200 group"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <BookOpen className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      {library.name}
                    </h3>
                    {library.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {library.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {library.library_books_count || 0} books
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
