Obvia — Personal Intelligent Library Manager (Single-User)

Goal: Build a minimal, single-user app to manage a personal book library with ISBN lookup (incl. barcode scan), enriched metadata, intelligent notes, basic + semantic search, and simple recommendations.
Stack: Backend = Python 3.11, Django 5, DRF, MySQL 8; Frontend = React 18 (Vite), Tailwind CSS.
Packaging: Docker (multi-stage) + docker-compose.
Style: Sleek, modern, monochrome (grays/black/white), dark/light.

Working Rules for the AI Agent
	•	✅ Track progress: Maintain a top-level PROGRESS.md with the checklist below. Mark each item as [x] only after building + testing it.
	•	🔁 Work in steps: You do not need to build everything at once. Implement in logical batches (Phase 1, 2, 3…).
	•	🧪 Test continuously: Add minimal tests and/or run flows to verify each feature before checking it off.
	•	🧾 Document: Keep README.md current (setup, run, endpoints, screenshots/gifs).
	•	🧩 Simplicity first: Single user only; no signup/login/auth. Avoid unnecessary abstractions.
	•	🧰 No Makefile: Use npm/pip scripts and docker-compose commands in the README.
	•	🔐 Privacy: Local/private use. Warn that only PDFs the user has rights to should be uploaded.

⸻

Phase 0 — Repo & Scaffolding ✅
	•	✅ Create a monorepo with:

obvia/
  backend/
  frontend/
  docker/
  README.md
  PROGRESS.md
  .env.example


	•	✅ Add .gitignore and sensible defaults for both apps.
	•	✅ Add .env.example with keys:
	•	MYSQL_HOST=mysql
	•	MYSQL_PORT=3306
	•	MYSQL_DB=obvia
	•	MYSQL_USER=obvia
	•	MYSQL_PASSWORD=obvia
	•	MEDIA_ROOT=/app/media
	•	GOOGLE_BOOKS_ENABLED=true
	•	OPEN_LIBRARY_ENABLED=true
	•	USE_OBJECT_STORAGE=false
	•	OBJECT_STORAGE_* (commented)
	•	AI_PROVIDER=disabled|openai|local
	•	OPENAI_API_KEY (optional)
	•	✅ Create docker-compose.yml with services: mysql, redis (for tasks/cache), backend, frontend, and optional minio (off by default).
	•	✅ Add minimal README.md with one-shot startup instructions:
	•	docker compose up --build
	•	Frontend on http://localhost:5173, API on http://localhost:8000.

⸻

Phase 1 — Backend (Django + DRF + MySQL) ✅
	•	✅ Initialize Django project backend/obvia_core with apps:
	•	books (metadata, authors, tags, shelves)
	•	libraries (user libraries & library_books)
	•	notes (notes/reviews/ratings)
	•	files (uploads, PDF text extraction)
	•	search (basic + semantic endpoints, embeddings table)
	•	ingest (Google/Open Library clients; Celery tasks)
	•	✅ Configure MySQL connection via env; run initial migration.
	•	✅ Models (minimal single-user scope — no auth tables):
	•	Library(id, name, description, created_at)
	•	Book(id uuid, primary_isbn_13, isbn_10, title, subtitle, description, publisher, publication_date, page_count, language, cover_url, toc_json JSON, source, created_at, updated_at)
	•	Author(id, name) + M2M Book.authors
	•	LibraryBook(id, library FK, book FK, added_at, custom_title, custom_notes_summary)
	•	Tag(id, name) + M2M via LibraryBookTag(library_book FK, tag FK)
	•	Note(id, library_book FK, title, content_markdown, content_html, created_at, updated_at, ai_generated bool, section_ref nullable)
	•	Rating(id, library_book FK, rating int 1–5, created_at)
	•	Review(id, library_book FK, title, body_markdown, body_html, created_at, updated_at)
	•	Shelf(id, name, is_system bool) + ShelfItem(id, shelf FK, library_book FK, added_at) (system names: wishlist, reading, finished)
	•	BookFile(id, library_book FK, file_type enum(pdf,epub), file_path or object_key, bytes int, checksum, uploaded_at, text_extracted bool)
	•	SearchEmbedding(id, owner_type enum(book,note,review,file_text), owner_id, vector blob, model, created_at)
	•	✅ Add useful indexes and uniqueness (e.g., unique primary_isbn_13, tag name unique, etc.).
	•	✅ Serializers/ViewSets/URLs (DRF):
	•	GET /api/libraries/, POST /api/libraries/, PATCH/DELETE /api/libraries/{id}
	•	POST /api/books/lookup → {isbn} (no save)
	•	POST /api/books/ingest → {isbn} (create if missing; returns normalized Book)
	•	POST /api/libraries/{libraryId}/books → {book_id}
	•	GET /api/libraries/{libraryId}/books (filters: q, author, tag, rating, shelf)
	•	DELETE /api/libraries/{libraryId}/books/{libraryBookId}
	•	Tags: POST /api/tags, GET /api/tags, attach/detach to LibraryBook
	•	Notes: POST/GET /api/library-books/{id}/notes, PATCH/DELETE /api/notes/{noteId}
	•	Ratings/Reviews: minimal create endpoints
	•	Files: POST multipart /api/library-books/{id}/files, GET /api/library-books/{id}/files, DELETE /api/files/{fileId}
	•	Search: GET /api/search/basic?q=...&library_id=... (title/author/isbn)
	•	Semantic: POST /api/search/semantic {query, library_id?, top_k} (stub allowed initially)
	•	Recs: GET /api/recommendations/{libraryBookId} (metadata-only first)
	•	✅ Add simple DRF tests for core endpoints (happy path) before checking off.

⸻

Phase 2 — Metadata Enrichment (Google/Open Library) ✅
	•	✅ Implement ingest.clients:
	•	google_books_lookup(isbn) → normalize fields
	•	open_library_lookup(isbn) → normalize fields (and covers)
	•	✅ Implement fallback logic: try Google → if not found/incomplete, try Open Library.
	•	✅ Normalize/clean data (prefer ISBN-13, join authors, handle missing fields).
	•	✅ Add POST /api/books/lookup and POST /api/books/ingest wiring + tests.
	•	✅ Seed a few ISBNs via a small management command or one-off script (document usage in README).

⸻

Phase 3 — Frontend (React + Vite + Tailwind, Monochrome UI) ✅
	•	✅ Initialize Vite React app in frontend/ with Tailwind configured to monochrome palette.
	•	✅ Routes:
	•	/ → Dashboard (list Libraries + global basic search input)
	•	/libraries/:libraryId → Grid/list of LibraryBooks with filters (tags, rating, shelves)
	•	/libraries/:libraryId/books/:libraryBookId → Book detail (tabs: Overview, Notes, Files, AI)
	•	/add → Add by ISBN/search + Barcode scanner modal
	•	✅ Components:
	•	Header (global search, dark/light toggle)
	•	BookCard (cover, title, author, tags)
	•	FiltersPanel (tags chips, rating slider, shelves)
	•	BarcodeScanner using @zxing/browser (EAN-13), with graceful camera permission fallback to manual ISBN input
	•	NotesEditor (Markdown textarea + preview) - placeholder for Phase 7
	•	RecommendationCarousel - placeholder for Phase 5
	•	SemanticSearchPanel (query box + results w/ type icon and score) - placeholder for Phase 6
	•	✅ Styling:
	•	Monochrome only; ample whitespace, rounded-2xl, subtle borders/shadows
	•	Keyboard focus states; responsive layout
	•	✅ Verify key flows E2E against API before checking off.

⸻

Phase 4 — Files & PDF Text Extraction ✅
	•	✅ Implement file upload to local disk volume (MEDIA_ROOT), with validation (size, MIME).
	•	✅ Extract text from PDFs (use pypdf first; Tesseract optional behind flag later).
	•	✅ Store extracted text chunks linked to BookFile.
	•	✅ Include extracted text in semantic search (Phase 6).

⸻

Phase 5 — Basic Search & Recommendations (Metadata-Only) ✅
	•	✅ /api/search/basic: search by title/author/isbn; support filter params (library, tag, rating, shelf).
	•	✅ /api/recommendations/{libraryBookId}: recommend by shared authors/subjects/keywords (simple similarity).
	•	✅ Frontend: global search bar; per-library filters; recs carousel in Book Detail.

⸻

Phase 6 — Semantic Search (Feature-Flag) ✅
	•	✅ Add AI_PROVIDER env: disabled (default), openai, local.
	•	✅ If enabled:
	•	✅ Create embeddings for: Book.description, Note.content, Review.body, File extracted text.
	•	✅ Store in SearchEmbedding with model metadata.
	•	✅ Implement KNN search (FAISS local or simple cosine via numpy for small data).
	•	✅ /api/search/semantic → returns hits with score + type + snippet.
	•	✅ Frontend: semantic search tab/panel with results list; show type and confidence.

⸻

Phase 7 — Notes & AI Assist (Optional) ✅
	•	✅ Notes Editor: Markdown + preview + keyboard shortcuts.
	•	✅ If AI_PROVIDER enabled:
	•	✅ /api/ai/note-assist {library_book_id, prompt, context_scope}: summarize chapter, extract key ideas, draft outline using available book/notes/file context.
	•	✅ Button in Notes UI to invoke assist; on success, append to draft or new note (tag as ai_generated=true).

⸻

Phase 8 — Ranking & Shelves ✅
	•	✅ Allow overall rating (1–5) and "category ratings" via tags (e.g., philosophy: 5).
	•	✅ Shelves: wishlist, reading, finished (+ custom)
	•	✅ Minimal UI controls for adding/removing shelves, adjusting ratings.
	•	✅ Basic list/sort by rating, and filter by shelves.

⸻

Phase 9 — Dockerization, Scripts, and Docs (No Makefile) ✅
	•	✅ Backend Dockerfile (multi-stage: deps → slim runtime w/ gunicorn).
	•	✅ Frontend Dockerfile (multi-stage: Vite build → Nginx serving dist/).
	•	✅ docker-compose.yml healthchecks; persistent volumes for MySQL and media.
	•	✅ README.md sections:
	•	✅ Prereqs and env
	•	✅ First run: docker compose up --build
	•	✅ Reset DB, apply migrations
	•	✅ Seeding example
	•	✅ Troubleshooting (ports, permissions, camera access)
	•	✅ Optional features (AI, MinIO)
	•	✅ Add screenshots/gifs of core flows.

⸻

Phase 10 — Minimal Tests & Sanity Checks ✅
	•	✅ DRF: happy-path tests for lookup/ingest, library add/remove, notes create, basic search.
	•	✅ Frontend: basic render tests for key pages and a couple of integration flows (add by ISBN, show metadata).
	•	✅ Manual runbook: barcode → fetch → add → notes → search → recommend → (optional) semantic search.

⸻

Nice-to-Haves (If Time)
	•	CSV import/export of library
	•	Kindle highlights import (CSV/JSON)
	•	Browser extension stub to capture current page → create book stub

⸻

Acceptance Criteria (to check off before “Done”)
	•	Single-user app runs locally via docker compose up --build
	•	Add book by ISBN (barcode scan or manual), enrich via Google/Open Library
	•	View & edit book metadata; add tags, shelves, ratings
	•	Create notes (Markdown); list/filter books by tags/shelves/rating
	•	Basic search works (title/author/isbn)
	•	Recommendations visible on Book Detail (metadata-only)
	•	Upload PDFs; extracted text stored
	•	(If enabled) Semantic search returns relevant hits across metadata/notes/PDF text
	•	Monochrome, responsive UI; dark/light toggle
	•	README.md and PROGRESS.md up to date

⸻

Implementation Hints (keep simple)
	•	Prefer functionality over perfection; ship minimal slices.
	•	For semantic search in small libraries, a basic cosine similarity can be fine before FAISS.
	•	If MySQL is heavy for first run, you may add a dev flag to use SQLite, but default to MySQL in Docker.
	•	Barcode: @zxing/browser EAN-13; handle permission errors gracefully with a manual ISBN input fallback.
	•	PDF text: pypdf first (no OCR); add OCR later only if needed.

⸻

Agent Reminder: Update PROGRESS.md continuously. Break the build into steps. After each step, run and test the feature, then check the item off. If a step is blocked, note blockers and move to the next independent task.