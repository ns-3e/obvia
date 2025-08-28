# Obvia Manual Runbook

This runbook provides step-by-step instructions for manually testing all core functionality of the Obvia Personal Intelligent Library Manager.

## Prerequisites

1. **Application Running**: Ensure the application is running via Docker Compose
   ```bash
   ./scripts/dev.sh
   # or
   docker compose up --build
   ```

2. **Access URLs**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/api/docs/

## Test Flow 1: Basic Setup and Navigation

### 1.1 Frontend Loading
- [ ] **Test**: Navigate to http://localhost:5173
- [ ] **Expected**: Dashboard loads with empty state or existing libraries
- [ ] **Verify**: Header shows "Obvia" title and theme toggle works

### 1.2 Theme Toggle
- [ ] **Test**: Click the theme toggle button (moon/sun icon)
- [ ] **Expected**: Application switches between light and dark themes
- [ ] **Verify**: Theme preference persists on page refresh

### 1.3 Global Search
- [ ] **Test**: Type in the global search bar
- [ ] **Expected**: Search results appear (empty if no data)
- [ ] **Verify**: Search is responsive and shows loading states

## Test Flow 2: Library Management

### 2.1 Create Library
- [ ] **Test**: Click "Create Library" or similar button
- [ ] **Expected**: Form opens for library creation
- [ ] **Test**: Fill in library name and description
- [ ] **Expected**: Library is created and appears in dashboard
- [ ] **Verify**: Library shows correct name and description

### 2.2 Library Navigation
- [ ] **Test**: Click on a library from the dashboard
- [ ] **Expected**: Navigate to library detail page
- [ ] **Verify**: Library detail shows book grid and filters

## Test Flow 3: Book Addition (Barcode Scan)

### 3.1 Navigate to Add Book
- [ ] **Test**: Click "Add Book" or navigate to /add
- [ ] **Expected**: Add book page loads with ISBN input and barcode scanner

### 3.2 Barcode Scanner
- [ ] **Test**: Click "Scan Barcode" button
- [ ] **Expected**: Camera permission request appears
- [ ] **Test**: Grant camera permission
- [ ] **Expected**: Camera view opens for barcode scanning
- [ ] **Test**: Scan a book barcode (ISBN-13)
- [ ] **Expected**: ISBN is detected and populated in input field

### 3.3 Manual ISBN Input (Fallback)
- [ ] **Test**: If camera fails, manually enter ISBN: `9780140283334` (Lord of the Flies)
- [ ] **Expected**: ISBN is accepted and lookup begins
- [ ] **Verify**: Loading indicator shows during lookup

### 3.4 Metadata Enrichment
- [ ] **Test**: After ISBN lookup, verify metadata is populated
- [ ] **Expected**: Book title, author, description, cover image appear
- [ ] **Verify**: Data comes from Google Books or Open Library API

### 3.5 Add Book to Library
- [ ] **Test**: Select target library from dropdown
- [ ] **Expected**: Library options are available
- [ ] **Test**: Click "Add to Library"
- [ ] **Expected**: Book is added to selected library
- [ ] **Verify**: Success message appears and redirects to library

## Test Flow 4: Book Management

### 4.1 Book Detail View
- [ ] **Test**: Click on a book in the library
- [ ] **Expected**: Book detail page opens with tabs (Overview, Notes, Files, AI)
- [ ] **Verify**: All book metadata is displayed correctly

### 4.2 Book Metadata Display
- [ ] **Test**: Verify book information is complete
- [ ] **Expected**: Title, author, ISBN, description, cover image, publisher, publication date
- [ ] **Verify**: All fields are populated from metadata enrichment

### 4.3 Book Editing
- [ ] **Test**: Click edit button on book
- [ ] **Expected**: Edit form opens with current data
- [ ] **Test**: Modify title or description
- [ ] **Expected**: Changes are saved
- [ ] **Verify**: Updated information appears in book detail

## Test Flow 5: Tags and Shelves

### 5.1 Add Tags
- [ ] **Test**: In book detail, add tags (e.g., "Fiction", "Classic")
- [ ] **Expected**: Tags are added and displayed
- [ ] **Verify**: Tags appear as chips/badges

### 5.2 System Shelves
- [ ] **Test**: In Overview tab, add book to "Reading" shelf
- [ ] **Expected**: Book appears in Reading shelf
- [ ] **Test**: Move book to "Finished" shelf
- [ ] **Expected**: Book moves to Finished shelf
- [ ] **Test**: Add book to "Wishlist"
- [ ] **Expected**: Book appears in Wishlist

### 5.3 Custom Shelves
- [ ] **Test**: Create a new custom shelf (e.g., "Favorites")
- [ ] **Expected**: Custom shelf is created
- [ ] **Test**: Add book to custom shelf
- [ ] **Expected**: Book appears in custom shelf
- [ ] **Verify**: Custom shelf appears in shelf list

## Test Flow 6: Ratings and Reviews

### 6.1 Overall Rating
- [ ] **Test**: In Overview tab, click on star rating
- [ ] **Expected**: Rating is set (1-5 stars)
- [ ] **Verify**: Rating is saved and displayed

### 6.2 Category Ratings
- [ ] **Test**: Add category-specific rating (e.g., "Writing: 5 stars")
- [ ] **Expected**: Category rating is added
- [ ] **Verify**: Category ratings appear in rating summary

### 6.3 Reviews
- [ ] **Test**: In Notes tab, create a review
- [ ] **Expected**: Review form opens
- [ ] **Test**: Add review title and content
- [ ] **Expected**: Review is saved and displayed
- [ ] **Verify**: Review appears in book's review list

## Test Flow 7: Notes and AI Assist

### 7.1 Create Note
- [ ] **Test**: In Notes tab, click "Add Note"
- [ ] **Expected**: Note editor opens
- [ ] **Test**: Write note in Markdown format
- [ ] **Expected**: Markdown is rendered in preview
- [ ] **Test**: Save note
- [ ] **Expected**: Note is saved and appears in notes list

### 7.2 Markdown Features
- [ ] **Test**: Use Markdown features in note
- [ ] **Expected**: Headers, lists, bold, italic, code blocks render correctly
- [ ] **Verify**: Preview shows formatted content

### 7.3 AI Assistance (if enabled)
- [ ] **Test**: Click "AI Assist" button in note editor
- [ ] **Expected**: AI assistance panel opens
- [ ] **Test**: Enter prompt (e.g., "Summarize this book")
- [ ] **Expected**: AI generates response
- [ ] **Test**: Insert AI response into note
- [ ] **Expected**: AI content is added to note
- [ ] **Verify**: AI-generated content is tagged appropriately

## Test Flow 8: File Upload and PDF Text Extraction

### 8.1 Upload PDF
- [ ] **Test**: In Files tab, drag and drop a PDF file
- [ ] **Expected**: File upload begins with progress indicator
- [ ] **Test**: Wait for upload to complete
- [ ] **Expected**: File appears in file list
- [ ] **Verify**: File metadata (size, type, upload date) is displayed

### 8.2 PDF Text Extraction
- [ ] **Test**: After PDF upload, verify text extraction
- [ ] **Expected**: Text extraction status shows "Completed"
- [ ] **Test**: Click "View Extracted Text"
- [ ] **Expected**: Extracted text is displayed
- [ ] **Verify**: Text content is readable and complete

### 8.3 File Management
- [ ] **Test**: Delete uploaded file
- [ ] **Expected**: File is removed from list
- [ ] **Verify**: File is actually deleted from storage

## Test Flow 9: Search Functionality

### 9.1 Basic Search
- [ ] **Test**: Use global search to find books
- [ ] **Expected**: Search results appear for matching books
- [ ] **Test**: Search by title, author, or ISBN
- [ ] **Expected**: Relevant results are returned
- [ ] **Verify**: Search results show snippets with highlighted matches

### 9.2 Advanced Filtering
- [ ] **Test**: In library view, use filters (author, tag, rating, shelf)
- [ ] **Expected**: Book list is filtered accordingly
- [ ] **Test**: Combine multiple filters
- [ ] **Expected**: Results are filtered by all criteria
- [ ] **Verify**: Filter state is maintained during navigation

### 9.3 Search in File Content
- [ ] **Test**: Search for text that appears in uploaded PDF
- [ ] **Expected**: Search results include file content matches
- [ ] **Verify**: File search results show relevant snippets

## Test Flow 10: Recommendations

### 10.1 Book Recommendations
- [ ] **Test**: In book detail Overview tab, check recommendations
- [ ] **Expected**: Similar books are recommended
- [ ] **Test**: Click on a recommendation
- [ ] **Expected**: Navigate to recommended book detail
- [ ] **Verify**: Recommendations are based on metadata similarity

### 10.2 Recommendation Reasons
- [ ] **Test**: Check recommendation reasons
- [ ] **Expected**: Reasons show why books are recommended (same author, publisher, etc.)
- [ ] **Verify**: Reasons are accurate and helpful

## Test Flow 11: Semantic Search (if enabled)

### 11.1 Semantic Search Panel
- [ ] **Test**: In AI tab, use semantic search
- [ ] **Expected**: Semantic search panel is available
- [ ] **Test**: Enter natural language query
- [ ] **Expected**: Semantic search results appear
- [ ] **Verify**: Results are relevant to query meaning

### 11.2 Semantic Search Results
- [ ] **Test**: Check result types (books, notes, file content)
- [ ] **Expected**: Results include different content types
- [ ] **Test**: Click on semantic search result
- [ ] **Expected**: Navigate to relevant content
- [ ] **Verify**: Results have confidence scores

## Test Flow 12: Error Handling

### 12.1 Network Errors
- [ ] **Test**: Disconnect internet and try ISBN lookup
- [ ] **Expected**: Graceful error message appears
- [ ] **Test**: Reconnect and retry
- [ ] **Expected**: Functionality works normally

### 12.2 Invalid ISBN
- [ ] **Test**: Enter invalid ISBN format
- [ ] **Expected**: Validation error message appears
- [ ] **Test**: Enter non-existent ISBN
- [ ] **Expected**: "Not found" message appears

### 12.3 File Upload Errors
- [ ] **Test**: Try to upload non-PDF file
- [ ] **Expected**: File type validation error
- [ ] **Test**: Try to upload very large file
- [ ] **Expected**: File size validation error

## Test Flow 13: Performance and Responsiveness

### 13.1 Mobile Responsiveness
- [ ] **Test**: Use application on mobile device or resize browser
- [ ] **Expected**: Interface adapts to smaller screens
- [ ] **Verify**: All functionality works on mobile

### 13.2 Loading States
- [ ] **Test**: Perform operations that take time (upload, search, etc.)
- [ ] **Expected**: Loading indicators appear
- [ ] **Verify**: Loading states are informative and not blocking

### 13.3 Large Library Performance
- [ ] **Test**: Add many books to library
- [ ] **Expected**: Performance remains acceptable
- [ ] **Verify**: Search and filtering work efficiently

## Test Flow 14: Data Persistence

### 14.1 Browser Refresh
- [ ] **Test**: Perform actions and refresh browser
- [ ] **Expected**: Data persists across refresh
- [ ] **Verify**: Application state is maintained

### 14.2 Browser Navigation
- [ ] **Test**: Use browser back/forward buttons
- [ ] **Expected**: Navigation works correctly
- [ ] **Verify**: Application state is preserved

## Test Flow 15: Accessibility

### 15.1 Keyboard Navigation
- [ ] **Test**: Navigate using only keyboard (Tab, Enter, Arrow keys)
- [ ] **Expected**: All functionality is accessible via keyboard
- [ ] **Verify**: Focus indicators are visible

### 15.2 Screen Reader Compatibility
- [ ] **Test**: Use screen reader to navigate
- [ ] **Expected**: All content is properly announced
- [ ] **Verify**: ARIA labels and descriptions are present

## Success Criteria

All test flows should complete successfully with:
- ✅ No critical errors or crashes
- ✅ All expected functionality working
- ✅ Good user experience and performance
- ✅ Data persistence across sessions
- ✅ Responsive design on different screen sizes
- ✅ Proper error handling and user feedback

## Troubleshooting

### Common Issues:
1. **Camera not working**: Check browser permissions and try manual ISBN input
2. **API errors**: Verify backend is running and check logs
3. **File upload fails**: Check file size and type restrictions
4. **Search not working**: Verify database is properly seeded
5. **AI features disabled**: Check AI_PROVIDER setting in environment

### Debug Commands:
```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart services
docker compose restart backend
docker compose restart frontend

# Reset database
docker compose down -v
docker compose up --build
```

## Completion Checklist

- [ ] All test flows completed successfully
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] User experience is smooth
- [ ] Error handling works properly
- [ ] Data persistence verified
- [ ] Accessibility requirements met
- [ ] Documentation is complete

---

**Note**: This runbook should be executed after each major release or significant change to ensure the application is working correctly.
