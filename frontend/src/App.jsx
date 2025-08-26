import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import LibraryDetail from './pages/LibraryDetail'
import BookDetail from './pages/BookDetail'
import AddBook from './pages/AddBook'
import BulkScan from './pages/BulkScan'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/libraries/:libraryId" element={<LibraryDetail />} />
              <Route path="/libraries/:libraryId/books/:bookId" element={<BookDetail />} />
              <Route path="/add" element={<AddBook />} />
              <Route path="/scan" element={<BulkScan />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
