import requests
import logging
from typing import Dict, Optional, List
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


class GoogleBooksClient:
    """Client for Google Books API."""
    
    BASE_URL = "https://www.googleapis.com/books/v1/volumes"
    
    def __init__(self):
        self.enabled = getattr(settings, 'GOOGLE_BOOKS_ENABLED', True)
    
    def lookup_by_isbn(self, isbn: str) -> Optional[Dict]:
        """Lookup book by ISBN using Google Books API."""
        if not self.enabled:
            logger.info("Google Books API is disabled")
            return None
        
        try:
            # Clean ISBN (remove hyphens and spaces)
            clean_isbn = isbn.replace('-', '').replace(' ', '')
            
            # Search by ISBN
            params = {
                'q': f'isbn:{clean_isbn}',
                'key': getattr(settings, 'GOOGLE_BOOKS_API_KEY', None)
            }
            
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('totalItems', 0) == 0:
                logger.info(f"No book found for ISBN {isbn} in Google Books")
                return None
            
            # Get the first result
            volume_info = data['items'][0]['volumeInfo']
            
            return self._normalize_volume_info(volume_info, isbn)
            
        except requests.RequestException as e:
            logger.error(f"Google Books API request failed for ISBN {isbn}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error processing Google Books response for ISBN {isbn}: {e}")
            return None
    
    def _normalize_volume_info(self, volume_info: Dict, original_isbn: str) -> Dict:
        """Normalize Google Books volume info to our format."""
        # Extract ISBNs
        isbn_13 = None
        isbn_10 = None
        
        if 'industryIdentifiers' in volume_info:
            for identifier in volume_info['industryIdentifiers']:
                if identifier['type'] == 'ISBN_13':
                    isbn_13 = identifier['identifier']
                elif identifier['type'] == 'ISBN_10':
                    isbn_10 = identifier['identifier']
        
        # Use original ISBN if not found in identifiers
        if not isbn_13 and not isbn_10:
            if len(original_isbn) == 13:
                isbn_13 = original_isbn
            elif len(original_isbn) == 10:
                isbn_10 = original_isbn
        
        # Extract authors
        authors = volume_info.get('authors', [])
        
        # Extract publication date
        published_date = volume_info.get('publishedDate')
        if published_date:
            try:
                # Try to parse the date (Google Books format varies)
                if len(published_date) == 4:  # Just year
                    published_date = f"{published_date}-01-01"
                elif len(published_date) == 7:  # Year-Month
                    published_date = f"{published_date}-01"
            except:
                published_date = None
        
        # Extract page count
        page_count = volume_info.get('pageCount')
        
        # Extract cover image
        cover_url = None
        if 'imageLinks' in volume_info:
            cover_url = volume_info['imageLinks'].get('thumbnail')
            if cover_url:
                # Convert to HTTPS and remove zoom parameter
                cover_url = cover_url.replace('http://', 'https://').split('&zoom=')[0]
        
        return {
            'primary_isbn_13': isbn_13,
            'isbn_10': isbn_10,
            'title': volume_info.get('title', ''),
            'subtitle': volume_info.get('subtitle'),
            'description': volume_info.get('description'),
            'publisher': volume_info.get('publisher'),
            'publication_date': published_date,
            'page_count': page_count,
            'language': volume_info.get('language', 'en'),
            'cover_url': cover_url,
            'authors': authors,
            'source': 'google_books'
        }


class OpenLibraryClient:
    """Client for Open Library API."""
    
    BASE_URL = "https://openlibrary.org"
    
    def __init__(self):
        self.enabled = getattr(settings, 'OPEN_LIBRARY_ENABLED', True)
    
    def lookup_by_isbn(self, isbn: str) -> Optional[Dict]:
        """Lookup book by ISBN using Open Library API."""
        if not self.enabled:
            logger.info("Open Library API is disabled")
            return None
        
        try:
            # Clean ISBN (remove hyphens and spaces)
            clean_isbn = isbn.replace('-', '').replace(' ', '')
            
            # Search by ISBN
            url = f"{self.BASE_URL}/isbn/{clean_isbn}.json"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 404:
                logger.info(f"No book found for ISBN {isbn} in Open Library")
                return None
            
            response.raise_for_status()
            data = response.json()
            
            return self._normalize_work_data(data, isbn)
            
        except requests.RequestException as e:
            logger.error(f"Open Library API request failed for ISBN {isbn}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error processing Open Library response for ISBN {isbn}: {e}")
            return None
    
    def _normalize_work_data(self, work_data: Dict, original_isbn: str) -> Dict:
        """Normalize Open Library work data to our format."""
        # Extract ISBNs
        isbn_13 = None
        isbn_10 = None
        
        if 'isbn_13' in work_data:
            isbn_13 = work_data['isbn_13'][0] if work_data['isbn_13'] else None
        if 'isbn_10' in work_data:
            isbn_10 = work_data['isbn_10'][0] if work_data['isbn_10'] else None
        
        # Use original ISBN if not found
        if not isbn_13 and not isbn_10:
            if len(original_isbn) == 13:
                isbn_13 = original_isbn
            elif len(original_isbn) == 10:
                isbn_10 = original_isbn
        
        # Extract authors
        authors = []
        if 'authors' in work_data:
            for author_ref in work_data['authors']:
                try:
                    author_url = f"{self.BASE_URL}{author_ref['key']}.json"
                    author_response = requests.get(author_url, timeout=5)
                    if author_response.status_code == 200:
                        author_data = author_response.json()
                        authors.append(author_data.get('name', ''))
                except:
                    continue
        
        # Extract publication date
        published_date = None
        if 'publish_date' in work_data:
            try:
                published_date = work_data['publish_date']
                # Try to parse the date
                if len(published_date) == 4:  # Just year
                    published_date = f"{published_date}-01-01"
                elif len(published_date) == 7:  # Year-Month
                    published_date = f"{published_date}-01"
            except:
                published_date = None
        
        # Extract page count
        page_count = work_data.get('number_of_pages_median')
        
        # Extract cover image
        cover_url = None
        if 'covers' in work_data and work_data['covers']:
            cover_id = work_data['covers'][0]
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
        
        return {
            'primary_isbn_13': isbn_13,
            'isbn_10': isbn_10,
            'title': work_data.get('title', ''),
            'subtitle': None,  # Open Library doesn't have subtitle field
            'description': work_data.get('description', {}).get('value') if isinstance(work_data.get('description'), dict) else work_data.get('description'),
            'publisher': work_data.get('publishers', [{}])[0].get('name') if work_data.get('publishers') else None,
            'publication_date': published_date,
            'page_count': page_count,
            'language': work_data.get('languages', [{}])[0].get('key', 'en').split('/')[-1] if work_data.get('languages') else 'en',
            'cover_url': cover_url,
            'authors': authors,
            'source': 'open_library'
        }


class BookMetadataClient:
    """Main client for book metadata enrichment."""
    
    def __init__(self):
        self.google_client = GoogleBooksClient()
        self.open_library_client = OpenLibraryClient()
    
    def lookup_by_isbn(self, isbn: str) -> Optional[Dict]:
        """Lookup book by ISBN with fallback logic."""
        logger.info(f"Looking up book metadata for ISBN: {isbn}")
        
        # Try Google Books first
        if self.google_client.enabled:
            result = self.google_client.lookup_by_isbn(isbn)
            if result and self._is_complete_result(result):
                logger.info(f"Found complete book data from Google Books for ISBN {isbn}")
                return result
            elif result:
                logger.info(f"Found partial book data from Google Books for ISBN {isbn}")
        
        # Try Open Library as fallback
        if self.open_library_client.enabled:
            result = self.open_library_client.lookup_by_isbn(isbn)
            if result:
                logger.info(f"Found book data from Open Library for ISBN {isbn}")
                return result
        
        logger.warning(f"No book data found for ISBN {isbn}")
        return None
    
    def _is_complete_result(self, result: Dict) -> bool:
        """Check if the result has essential fields."""
        essential_fields = ['title', 'authors']
        return all(result.get(field) for field in essential_fields)
    
    def enrich_book_data(self, isbn: str, existing_data: Dict = None) -> Dict:
        """Enrich existing book data with external metadata."""
        external_data = self.lookup_by_isbn(isbn)
        
        if not external_data:
            return existing_data or {}
        
        if not existing_data:
            return external_data
        
        # Merge data, preferring external data for missing fields
        merged_data = existing_data.copy()
        for key, value in external_data.items():
            if not merged_data.get(key) and value:
                merged_data[key] = value
        
        return merged_data
