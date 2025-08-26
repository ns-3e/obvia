import { useState, useEffect } from 'react'
import { Star, Plus, X, Loader } from 'lucide-react'
import { ratingsAPI } from '../utils/api'

const RatingPanel = ({ libraryBookId, onRatingChange }) => {
  const [ratingSummary, setRatingSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overallRating, setOverallRating] = useState(0)
  const [categoryRatings, setCategoryRatings] = useState({})
  const [availableTags, setAvailableTags] = useState([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newRating, setNewRating] = useState(3)

  useEffect(() => {
    if (libraryBookId) {
      loadRatingSummary()
      loadAvailableTags()
    }
  }, [libraryBookId])

  const loadRatingSummary = async () => {
    try {
      setLoading(true)
      const response = await ratingsAPI.summary(libraryBookId)
      setRatingSummary(response.data)
      setOverallRating(response.data.overall_rating || 0)
      
      // Convert category ratings to object
      const categoryObj = {}
      response.data.category_ratings.forEach(cat => {
        categoryObj[cat.category] = cat.rating
      })
      setCategoryRatings(categoryObj)
    } catch (error) {
      console.error('Failed to load rating summary:', error)
      setError('Failed to load ratings')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableTags = async () => {
    try {
      // This would typically come from the book's tags
      // For now, we'll use some common categories
      setAvailableTags(['philosophy', 'fiction', 'non-fiction', 'science', 'history', 'biography'])
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const handleOverallRating = async (rating) => {
    try {
      setError(null)
      
      if (rating === overallRating) {
        // Remove rating if clicking the same star
        await ratingsAPI.delete(ratingSummary.overall_rating_id)
        setOverallRating(0)
      } else {
        // Create or update rating
        const response = await ratingsAPI.create({
          library_book: libraryBookId,
          rating: rating
        })
        setOverallRating(rating)
      }
      
      await loadRatingSummary()
      if (onRatingChange) {
        onRatingChange()
      }
    } catch (error) {
      console.error('Failed to update overall rating:', error)
      setError('Failed to update rating')
    }
  }

  const handleCategoryRating = async (category, rating) => {
    try {
      setError(null)
      
      if (rating === categoryRatings[category]) {
        // Remove rating if clicking the same star
        delete categoryRatings[category]
        setCategoryRatings({ ...categoryRatings })
      } else {
        // Create or update category rating
        await ratingsAPI.categoryRating({
          library_book_id: libraryBookId,
          category: category,
          rating: rating
        })
        setCategoryRatings({
          ...categoryRatings,
          [category]: rating
        })
      }
      
      await loadRatingSummary()
      if (onRatingChange) {
        onRatingChange()
      }
    } catch (error) {
      console.error('Failed to update category rating:', error)
      setError('Failed to update category rating')
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      setError('Category name is required')
      return
    }

    try {
      setError(null)
      await ratingsAPI.categoryRating({
        library_book_id: libraryBookId,
        category: newCategory.trim(),
        rating: newRating
      })
      
      setCategoryRatings({
        ...categoryRatings,
        [newCategory.trim()]: newRating
      })
      
      setNewCategory('')
      setNewRating(3)
      setShowAddCategory(false)
      
      await loadRatingSummary()
      if (onRatingChange) {
        onRatingChange()
      }
    } catch (error) {
      console.error('Failed to add category rating:', error)
      setError('Failed to add category rating')
    }
  }

  const StarRating = ({ rating, onRatingChange, size = 'md' }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRatingChange(star)}
            className={`transition-colors ${
              star <= rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className={sizeClasses[size]} fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Ratings
        </h3>
        <button
          onClick={() => setShowAddCategory(!showAddCategory)}
          className="btn-secondary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Overall Rating */}
      <div className="card p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Overall Rating
        </h4>
        <div className="flex items-center space-x-4">
          <StarRating 
            rating={overallRating} 
            onRatingChange={handleOverallRating}
            size="lg"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {overallRating > 0 ? `${overallRating}/5 stars` : 'Not rated'}
          </span>
        </div>
      </div>

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="card p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Add Category Rating
              </h4>
              <button
                onClick={() => setShowAddCategory(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., philosophy, fiction..."
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rating
                </label>
                <StarRating 
                  rating={newRating} 
                  onRatingChange={setNewRating}
                  size="md"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddCategory}
                className="btn-primary"
              >
                Add Rating
              </button>
              <button
                onClick={() => setShowAddCategory(false)}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Ratings */}
      {Object.keys(categoryRatings).length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Category Ratings
          </h4>
          
          {Object.entries(categoryRatings).map(([category, rating]) => (
            <div key={category} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {category}
                  </h5>
                  <StarRating 
                    rating={rating} 
                    onRatingChange={(newRating) => handleCategoryRating(category, newRating)}
                    size="md"
                  />
                </div>
                <button
                  onClick={() => handleCategoryRating(category, 0)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Tags */}
      {availableTags.length > 0 && Object.keys(categoryRatings).length === 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Quick Rate by Category
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setNewCategory(tag)
                  setNewRating(3)
                  setShowAddCategory(true)
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RatingPanel
