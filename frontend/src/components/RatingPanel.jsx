import { useState, useEffect } from 'react'
import { Star, Loader } from 'lucide-react'
import { ratingsAPI } from '../utils/api'

const RatingPanel = ({ libraryBookId, onRatingChange }) => {
  const [ratingSummary, setRatingSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overallRating, setOverallRating] = useState(0)

  useEffect(() => {
    if (libraryBookId) {
      loadRatingSummary()
    }
  }, [libraryBookId])

  const loadRatingSummary = async () => {
    try {
      setLoading(true)
      const response = await ratingsAPI.summary(libraryBookId)
      setRatingSummary(response.data)
      setOverallRating(response.data.overall_rating || 0)
    } catch (error) {
      console.error('Failed to load rating summary:', error)
      setError('Failed to load ratings')
    } finally {
      setLoading(false)
    }
  }

  const handleOverallRating = async (rating) => {
    try {
      setError(null)
      
      // Use the backend logic that handles toggle behavior
      const response = await ratingsAPI.create({
        library_book: libraryBookId,
        rating: rating,
        category: 'overall'
      })
      
      // Update local state based on response
      if (response.data.deleted) {
        setOverallRating(0)
      } else {
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
          Rating
        </h3>
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
    </div>
  )
}

export default RatingPanel
