import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BookOpen, Star } from 'lucide-react'
import { searchAPI } from '../utils/api'

const RecommendationCarousel = ({ libraryBookId, libraryId, limit = 5 }) => {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (libraryBookId) {
      loadRecommendations()
    }
  }, [libraryBookId])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await searchAPI.recommendations(libraryBookId, limit)
      setRecommendations(response.data.recommendations || [])
    } catch (error) {
      console.error('Failed to load recommendations:', error)
      setError('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + 1 >= recommendations.length ? 0 : prevIndex + 1
    )
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex - 1 < 0 ? recommendations.length - 1 : prevIndex - 1
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recommendations
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recommendations
        </h3>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recommendations
        </h3>
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No recommendations available yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        You might also like
      </h3>
      
      <div className="relative">
        {/* Navigation buttons */}
        {recommendations.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        
        {/* Carousel container */}
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {recommendations.map((rec, index) => (
              <div key={rec.id} className="w-full flex-shrink-0 px-2">
                <Link
                  to={`/libraries/${libraryId}/books/${rec.library_book_id || rec.id}`}
                  className="block"
                >
                  <div className="card p-4 hover:shadow-lg transition-shadow duration-200">
                    <div className="flex space-x-4">
                      {/* Cover */}
                      <div className="flex-shrink-0">
                        {rec.cover_url ? (
                          <img
                            src={rec.cover_url}
                            alt={rec.title}
                            className="w-16 h-20 object-cover rounded-lg shadow-soft"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {rec.title}
                        </h4>
                        
                        {rec.authors && rec.authors.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            by {rec.authors.join(', ')}
                          </p>
                        )}
                        
                        {/* Similarity score */}
                        <div className="flex items-center space-x-2 mt-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {rec.similarity_score} similarity
                          </span>
                        </div>
                        
                        {/* Similarity reasons */}
                        {rec.similarity_reasons && rec.similarity_reasons.length > 0 && (
                          <div className="mt-2">
                            {rec.similarity_reasons.slice(0, 2).map((reason, idx) => (
                              <span
                                key={idx}
                                className="inline-block text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full mr-1 mb-1"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        
        {/* Dots indicator */}
        {recommendations.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {recommendations.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-gray-900 dark:bg-gray-100'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecommendationCarousel
