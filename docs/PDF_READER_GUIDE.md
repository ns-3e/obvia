# PDF Reader Guide

## Overview

The PDF Reader is a comprehensive tool that allows users to read PDF files uploaded to books with advanced features including text highlighting, navigation, and zoom controls.

## Features

### Core Functionality
- **PDF Viewing**: Full PDF document rendering with page navigation
- **Text Highlighting**: Select and highlight text with persistent storage
- **Zoom Controls**: Zoom in/out from 50% to 300%
- **Page Rotation**: Rotate pages in 90-degree increments
- **Download**: Download the original PDF file
- **Keyboard Shortcuts**: Quick access to common functions

### Highlighting System
- **Text Selection**: Click the highlighter icon or press 'H' to enable highlighting mode
- **Persistent Storage**: Highlights are saved to the database and persist across sessions
- **Visual Feedback**: Highlighted text is visually marked with yellow overlay
- **Page-specific**: Highlights are associated with specific pages

## How to Use

### Opening a PDF
1. Navigate to a book's detail page
2. Go to the "Files" tab
3. Find a PDF file in the list
4. Click the book icon (📖) next to the PDF file
5. The PDF reader will open in a modal window

### Reading Navigation
- **Previous Page**: Click left arrow or press `←`
- **Next Page**: Click right arrow or press `→`
- **Page Counter**: Shows current page and total pages at the bottom

### Highlighting Text
1. **Enable Highlighting**: Click the highlighter icon (🖍️) or press `H`
2. **Select Text**: Click and drag to select text on the page
3. **Create Highlight**: Release the mouse to create a highlight
4. **Disable Highlighting**: Press `H` again or `Escape` to exit highlighting mode

### Zoom and Rotation
- **Zoom In**: Press `=` or `+`
- **Zoom Out**: Press `-`
- **Rotate**: Press `R` to rotate 90 degrees clockwise
- **Settings Panel**: Click the settings icon to access zoom controls

### Keyboard Shortcuts
| Key | Function |
|-----|----------|
| `←` | Previous page |
| `→` | Next page |
| `=` or `+` | Zoom in |
| `-` | Zoom out |
| `R` | Rotate page |
| `H` | Toggle highlighting mode |
| `Escape` | Exit highlighting mode or close reader |

## Technical Implementation

### Backend Components
- **PDFHighlight Model**: Stores highlight data (text, position, page, color)
- **PDFHighlightViewSet**: API endpoints for CRUD operations on highlights
- **File Serving**: Media files served through Django's static file handling

### Frontend Components
- **PDFReader**: Main component using `react-pdf` library
- **FileList**: Enhanced to include "Read PDF" button
- **API Integration**: `pdfHighlightsAPI` for backend communication

### Data Structure
```json
{
  "id": 1,
  "book_file": 1,
  "text": "highlighted text content",
  "page": 1,
  "x": 100.5,
  "y": 200.3,
  "width": 150.2,
  "height": 20.1,
  "color": "#ffeb3b",
  "created_at": "2025-08-29T03:30:44.505315Z"
}
```

## File Requirements

### Supported Formats
- **PDF**: Primary format with full feature support
- **EPUB**: Basic viewing (highlighting not yet implemented)

### File Size Limits
- Maximum file size: 50MB
- Recommended: Under 20MB for optimal performance

## Browser Compatibility

### Required Features
- Modern browser with ES6+ support
- Canvas API support
- File API support

### Recommended Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

### Large PDFs
- PDFs with many pages may take longer to load
- Text extraction is performed asynchronously
- Highlights are loaded on-demand per page

### Memory Usage
- Each page is rendered as needed
- Previous pages are cached in memory
- Large PDFs may require more RAM

## Troubleshooting

### Common Issues

**PDF won't load**
- Check file format (must be PDF)
- Verify file size (under 50MB)
- Ensure file is properly uploaded

**Highlights not saving**
- Check internet connection
- Verify backend API is running
- Check browser console for errors

**Text selection not working**
- Ensure highlighting mode is enabled (press 'H')
- Try refreshing the page
- Check if PDF has selectable text

### Error Messages
- **"Failed to load PDF"**: File format or size issue, or PDF.js worker loading problem
- **"PDF loading timeout"**: PDF is taking too long to load (30+ seconds)
- **"Failed to save highlight"**: Network or backend issue
- **"Text extraction failed"**: PDF may be image-based or corrupted

## Future Enhancements

### Planned Features
- **Multiple highlight colors**: Choose from color palette
- **Highlight notes**: Add annotations to highlights
- **Search highlights**: Search through highlighted text
- **Export highlights**: Export highlights as notes or annotations
- **EPUB support**: Full highlighting support for EPUB files
- **Mobile optimization**: Touch-friendly interface for mobile devices

### Technical Improvements
- **Virtual scrolling**: Better performance for large PDFs
- **Offline support**: Cache PDFs and highlights locally
- **Collaborative highlighting**: Share highlights between users
- **Advanced search**: Full-text search within PDFs
