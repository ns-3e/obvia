import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sun, Moon, Plus, BookOpen, Camera, Library } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const Header = () => {
  const { isDark, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-gray-900 dark:text-gray-100" />
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Preposition
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search books, authors, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Libraries Button */}
            <Link
              to="/libraries"
              className="btn-outline flex items-center space-x-2"
            >
              <Library className="h-4 w-4" />
              <span>Libraries</span>
            </Link>

            {/* Bulk Scan Button */}
            <Link
              to="/scan"
              className="btn-outline flex items-center space-x-2"
            >
              <Camera className="h-4 w-4" />
              <span>Bulk Scan</span>
            </Link>

            {/* Add Book Button */}
            <Link
              to="/add"
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Book</span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
