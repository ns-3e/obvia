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
Here’s a Cursor-ready checklist prompt for your Phase 11—bulk scanning via webcam with live chime and a live import queue. It’s designed for a single-user app (no auth), keeps things simple, and tells the agent to track progress in PROGRESS.md and work in steps.

⸻

Phase 11 — Bulk Webcam Scan & Auto-Import (No Code; Checklist for Cursor Agent)

Goal: Enable live, continuous barcode scanning via the webcam. When a new unique ISBN/EAN-13 is detected, play a ping/chime, add the book to a live queue panel on the right, and auto-fetch metadata (Google Books → Open Library fallback) to insert into the local library without extra clicks.

Working Rules for the AI Agent
	•	Track progress: Update PROGRESS.md and check off each item only after you’ve built & tested it.
	•	Work in steps: You can split Phase 11 into sub-steps (11.1, 11.2, …) and complete them iteratively.
	•	Document: Add user instructions, known limitations, and screenshots/GIFs to README.md.

⸻

11.1 UI/UX — Bulk Scanner Page ✅
	•	✅ Add a route "Bulk Scan" accessible from the main UI (e.g., /scan or from library detail page).
	•	✅ Layout:
	•	✅ Left: Live camera preview with scanning overlay (reticle/guide box) and status text (e.g., "Ready", "Scanning…", "Detected 978…", "Duplicate skipped").
	•	✅ Right: Live queue panel listing newly scanned books (cover, title, author, ISBN, status). Latest at top.
	•	✅ Top/Toolbar: Select Target Library (dropdown), Start/Stop scanning, Clear Queue, and a simple Help/tips link.
	•	✅ Accessibility:
	•	✅ Ensure focus states and keyboard support (Start: Enter, Stop: Esc, Clear: Cmd/Ctrl-K).
	•	✅ Provide text alternatives for screen readers.
	•	✅ Monochrome styling consistent with app: borders, rounded corners, subtle shadows.

✅ Acceptance check: Page renders, controls present, no camera access yet.

⸻

11.2 Webcam Access & Scanner Lifecycle ✅
	•	✅ Request webcam permissions and start stream only when user clicks Start (avoid auto-prompt on page load).
	•	✅ Show clear messaging if camera permissions are denied; provide retry button.
	•	✅ Provide Start/Stop buttons that:
	•	✅ Start → attach video stream & scanning loop.
	•	✅ Stop → pause scanning loop and release tracks.
	•	✅ Handle device selection (default to environment/back camera on mobile if available).

✅ Acceptance check: Start/Stop reliably attach/detach the camera stream without errors; status text updates accordingly.

⸻

11.3 Barcode Detection Loop (Client-Side) ✅
	•	✅ Implement a frame sampling loop (e.g., ~6–12 FPS or throttled) to decode EAN-13/ISBN-13 only (ignore other symbologies).
	•	✅ Apply basic pre-processing: ensure good exposure and contrast; allow decoder to handle rotation.
	•	✅ Add debounce & cool-down (e.g., 800–1500 ms) to prevent repeat detections from a static frame.
	•	✅ Duplicate guard: maintain an in-memory Set of ISBNs seen in this session (and optionally cross-check against server to skip already-owned books).

✅ Acceptance check: Moving a barcode in/out of the frame produces at most one detection per unique barcode within the session.

⸻

11.4 ISBN Validation & Normalization ✅
	•	✅ Accept only EAN-13 values that begin with 978/979 and pass a check-digit verification.
	•	✅ Normalize to ISBN-13 string (digits only).
	•	✅ If a UPC-A is read, attempt to convert to ISBN-13 only when safe; otherwise ignore.

✅ Acceptance check: Invalid or non-book barcodes are ignored; only valid ISBN-13 makes it to the queue.

⸻

11.5 Chime & Feedback ✅
	•	✅ On first successful unique detection, play a short chime/ping (preload audio; respect user gesture policies).
	•	✅ Visual flash or brief badge animation near the queue.
	•	✅ If duplicate within session, play a softer tick or show "Duplicate skipped" (no chime).

✅ Acceptance check: Distinct audio/visual feedback for new vs duplicate.

⸻

11.6 Auto-Enrichment & Import Workflow ✅
	•	✅ Immediately after a unique ISBN is detected:
	•	✅ POST to existing ingest endpoint (/api/books/ingest) to normalize & create/find the Book (Google Books → Open Library fallback).
	•	✅ POST to add to library (/api/libraries/{libraryId}/books) with the selected target library.
	•	✅ Update the queue row status in real-time:
	•	✅ States: queued → fetching → imported (or skipped if already owned, error if failed).
	•	✅ Show the book cover/title/author once metadata returns.
	•	✅ If the target library changes mid-session, new scans should import to the new selection; existing queue items keep their original target.

✅ Acceptance check: New scans appear, trigger API calls, update to "imported" or "skipped/error," and the book shows in the target library list.

⸻

11.7 Queue Management & Controls ✅
	•	✅ Queue shows latest first, paginates if long, and is cleared by user action only.
	•	✅ Provide Remove action per row (to dismiss from view; doesn't delete library).
	•	✅ Provide Clear Queue button with confirm dialog.
	•	✅ Allow Export CSV of the session (ISBN, title, status, timestamp) for record-keeping.

✅ Acceptance check: Queue is usable, removable, exportable; no accidental deletion of library contents.

⸻

11.8 Error Handling & Offline Resilience ✅
	•	✅ If ingest fails (network, rate-limit, provider down), retry with backoff up to N times.
	•	✅ On persistent failure, mark error and allow Retry per item.
	•	✅ If offline:
	•	✅ Cache scanned ISBNs in memory, queue API calls until back online.
	•	✅ Display an "Offline — queued X items" banner; auto-resume when online.

✅ Acceptance check: Simulate offline/failed calls; verify retries, clear messaging, and manual retry control.

⸻

11.9 Performance & Safety ✅
	•	✅ Throttle frame processing and avoid main-thread jank (e.g., requestAnimationFrame cadence or timers).
	•	✅ Ensure audio does not stack (debounce chime).
	•	✅ Memory safety: prune in-session "seen ISBNs" if queue gets very large (>1k), but keep UI responsive.
	•	✅ Avoid spamming APIs: add a small per-ISBN in-flight lock to prevent double posts.

✅ Acceptance check: Sustained scanning of many books is smooth; API calls are one-per-unique ISBN.

⸻

11.10 Telemetry (Local Only) ✅
	•	✅ Console logs (dev only) for detections, duplicates, API outcomes.
	•	✅ Optional simple counters on the page: Scanned, Imported, Skipped, Errors.

✅ Acceptance check: Counters update reliably; logs are readable in dev.

⸻

11.11 Documentation & Short Demo ✅
	•	✅ Update README.md:
	•	✅ How to use Bulk Scan (permissions, lighting tips, distance/angle).
	•	✅ How to select a target library.
	•	✅ What the statuses mean; how to retry; how to export CSV.
	•	✅ Notes on duplicates, offline mode, and troubleshooting camera issues.
	•	✅ Add a short GIF/screenshots to demonstrate scanning → chime → queue → imported.

✅ Acceptance check: Docs are clear; a new user can complete a bulk scan session end-to-end.

⸻

Phase 11 — Final Acceptance Criteria
	•	Webcam scanning reliably detects unique ISBN-13 (978/979) and debounces duplicates.
	•	A chime plays on each new unique detection; duplicates are skipped with distinct feedback.
	•	Each new detection auto-ingests metadata and adds the book to the selected library.
	•	The right-hand queue updates in real time with cover/title/status and supports remove/clear/export.
	•	Robust handling of errors, retries, and offline scenarios.
	•	Performance is smooth; no memory leaks; Start/Stop behaves correctly.
	•	README.md updated; PROGRESS.md reflects completed checklist items.



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