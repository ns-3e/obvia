import { Link } from 'react-router-dom'
import { Star, Tag, Calendar } from 'lucide-react'

const BookCard = ({ book, libraryId }) => {
  const { id, title, subtitle, authors, cover_url, tags = [], rating } = book

  return (
    <Link
      to={`/libraries/${libraryId}/books/${id}`}
      className="card p-6 hover:shadow-lg transition-shadow duration-200 group"
    >
      <div className="flex flex-col h-full">
        {/* Cover Image */}
        <div className="relative mb-4">
          {cover_url ? (
            <img
              src={cover_url}
              alt={title}
              className="w-full h-48 object-cover rounded-2xl shadow-soft"
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                No Cover
              </span>
            </div>
          )}
          
          {/* Rating Badge */}
          {rating && (
            <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-full px-2 py-1 flex items-center space-x-1 shadow-soft">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {rating}
              </span>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
            {title}
          </h3>
          
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {subtitle}
            </p>
          )}
          
          {authors && authors.length > 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              by {authors.map(author => author.name).join(', ')}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="badge-primary flex items-center space-x-1"
                >
                  <Tag className="h-3 w-3" />
                  <span>{tag.name}</span>
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Publication Date */}
          {book.publication_date && (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{new Date(book.publication_date).getFullYear()}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default BookCard
