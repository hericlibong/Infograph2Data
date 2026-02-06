# Infograph2Data — Development Log

> Append-only. Never delete entries.

---

## [2026-02-05] Architecture Locked + Phase 1 Foundation

### Context
Initial project setup. Blueprint approved, now implementing runnable backend with health endpoint.

### Files Created
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI entrypoint
│   ├── config.py        # Settings with CORS origins
│   └── routers/
│       ├── __init__.py
│       └── health.py    # GET /health
docs/
├── architecture.md      # Full blueprint (locked)
└── devlog.md            # This file
.env.example             # Secret placeholders
.gitignore               # Ignore .venv, storage, exports, .env
pyproject.toml           # Dependencies
README.md                # Quick start guide
```

### Commands

```bash
# Activate virtual environment (already exists)
source .venv/bin/activate

# Install dependencies
pip install -e .

# Run the server (MUST use this exact command)
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Verify health endpoint (in another terminal)
curl http://127.0.0.1:8001/health
```

### Expected Output

Server startup:
```
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Health check response:
```json
{"status":"healthy","version":"0.1.0"}
```

### Decisions
- Chose Pydantic Settings for config (environment variable support, type safety).
- CORS configured for `http://localhost:5173` (Vite default) from the start.
- Health endpoint returns version for debugging deployments.

### Assumptions
- Python 3.12 is available in `.venv`.
- No database; filesystem storage under `backend/app/storage/` (gitignored).

### Next Steps
- [x] Phase 2: Upload endpoint + file storage service
- [ ] Phase 2: Dataset model (in-memory)

---

## [2026-02-05] Phase 2: Upload + Storage

### Context
Implement file upload (PDF/PNG/JPG), filesystem storage with UUID directories, and metadata retrieval.

### Files Created/Modified
```
backend/app/
├── schemas/upload.py      # FileMetadata, UploadResponse
├── services/storage.py    # save_file, get_file_metadata, list_files
├── routers/upload.py      # POST /files, GET /files/{id}, GET /files
├── main.py                # Added upload router
├── storage/
│   └── .gitkeep           # Gitignored storage directory
docs/
└── phase_2_plan.md        # API contracts + plan
pyproject.toml             # Added pymupdf dependency
demo_assets/
└── sample.pdf             # 3-page test PDF
```

### Commands

```bash
# Install updated dependencies
source .venv/bin/activate
pip install -e .

# Run the server
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Upload a PDF
curl -X POST http://127.0.0.1:8001/files \
  -F "file=@demo_assets/sample.pdf"

# Get file metadata by ID
curl http://127.0.0.1:8001/files/{id}

# List all uploaded files
curl http://127.0.0.1:8001/files
```

### Expected Output

**POST /files** (upload PDF):
```json
{
  "id": "1334f128-1980-41e0-98bb-6877f4d01499",
  "filename": "sample.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 1431,
  "pages": 3,
  "created_at": "2026-02-05T22:25:48.759470Z"
}
```

**GET /files/{id}**:
```json
{
  "id": "1334f128-1980-41e0-98bb-6877f4d01499",
  "filename": "sample.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 1431,
  "pages": 3,
  "created_at": "2026-02-05T22:25:48.759470Z"
}
```

**Invalid MIME type** (400):
```json
{"detail": "Unsupported file type: text/plain. Allowed: PDF, PNG, JPG."}
```

**File not found** (404):
```json
{"detail": "File not found: nonexistent-id"}
```

### Decisions
- Used PyMuPDF (fitz) for PDF page counting—fast, pure Python, no system dependencies.
- Storage layout: `storage/{uuid}/metadata.json` + `original.<ext>` for easy traversal.
- Added `GET /files` list endpoint (bonus) for debugging/frontend convenience.
- Max upload size: 50 MB (configurable in code, can move to env later).

### Assumptions
- Single-user mode; no file ownership or permissions.
- Files persist until manually deleted; no auto-cleanup.

### Next Steps
- [x] Phase 3: Extraction logic (PDF text, OCR, optional LLM)
- [x] Phase 3: POST /extract endpoint with page/region selection

---

## [2026-02-06] Phase 3: Scope + Extraction Logic

### Context
Implement PDF page previews, extraction job API, and auto extraction strategy with table parsing.

### Files Created/Modified
```
backend/app/
├── schemas/
│   ├── extraction.py      # ExtractRequest, JobResponse, PagesResponse
│   └── dataset.py         # Dataset, DatasetRow schemas
├── services/
│   ├── pdf.py             # Page rendering, text extraction
│   └── extractor.py       # Strategy orchestrator, table parsing
├── routers/
│   └── extraction.py      # Preview, extract, jobs endpoints
├── main.py                # Added extraction router
├── storage/
│   ├── datasets/.gitkeep  # Extracted datasets storage
│   └── jobs/.gitkeep      # Job state storage
docs/
└── phase_3_plan.md        # API contracts + decisions
demo_assets/
└── table_sample.pdf       # PDF with tabular data for testing
```

### Commands

```bash
# Run the server
source .venv/bin/activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Get PDF page info
curl http://127.0.0.1:8001/files/{file_id}/pages

# Preview page 1 at 2x scale (saves PNG)
curl "http://127.0.0.1:8001/files/{file_id}/pages/1/preview?scale=2" --output page1.png

# Start extraction job
curl -X POST http://127.0.0.1:8001/extract \
  -H "Content-Type: application/json" \
  -d '{"file_id": "{file_id}", "page": 1}'

# Check job status
curl http://127.0.0.1:8001/jobs/{job_id}

# Upload test PDF with table
curl -X POST http://127.0.0.1:8001/files \
  -F "file=@demo_assets/table_sample.pdf"
```

### Expected Output

**GET /files/{id}/pages**:
```json
{
  "file_id": "1334f128-1980-41e0-98bb-6877f4d01499",
  "filename": "sample.pdf",
  "total_pages": 3,
  "pages": [
    {"page": 1, "width": 595.0, "height": 842.0, "has_text": true},
    {"page": 2, "width": 595.0, "height": 842.0, "has_text": true},
    {"page": 3, "width": 595.0, "height": 842.0, "has_text": true}
  ]
}
```

**GET /files/{id}/pages/1/preview?scale=2**:
- Returns: PNG image (1190 x 1684 pixels at scale=2)
- Content-Type: image/png

**POST /extract**:
```json
{
  "job_id": "job-ab950f31a3b3",
  "dataset_id": "ds-7ddd04993628",
  "status": "completed",
  "created_at": "2026-02-06T00:04:21.592931Z"
}
```

**GET /jobs/{job_id}**:
```json
{
  "job_id": "job-ab950f31a3b3",
  "dataset_id": "ds-7ddd04993628",
  "status": "completed",
  "strategy_used": "pdf_text",
  "created_at": "2026-02-06T00:04:21.592931Z",
  "completed_at": "2026-02-06T00:04:21.605086Z",
  "error": null,
  "logs": [
    "Starting extraction on page 1",
    "Page has text layer: True",
    "Auto-selected strategy: pdf_text",
    "Extracted 13 characters",
    "Found 1 text blocks",
    "Parsed 1 rows with 1 columns",
    "Extraction completed successfully"
  ]
}
```

**Extracted dataset** (from table_sample.pdf):
```json
{
  "id": "ds-92a198fa93d7",
  "columns": ["Product", "Price", "Quantity"],
  "rows": [
    {"row_id": 1, "Product": "Apple", "Price": "1.50", "Quantity": "100"},
    {"row_id": 2, "Product": "Banana", "Price": "0.75", "Quantity": "200"},
    {"row_id": 3, "Product": "Orange", "Price": "2.00", "Quantity": "150"}
  ],
  "confidence": 0.8
}
```

**Page out of range** (400):
```json
{"detail": "Page 99 out of range (1-3)"}
```

**Job not found** (404):
```json
{"detail": "Job not found: nonexistent"}
```

### Decisions
- **Page numbering**: 1-indexed (matches PDF viewers, user-friendly).
- **Preview scale default**: 1.5 (72 DPI × 1.5 = 108 DPI, good balance).
- **Synchronous extraction**: Jobs run synchronously for MVP simplicity; job abstraction allows async later.
- **Table parsing heuristics**: Tab-delimited → pipe-delimited → multi-space → key-value → single column fallback.
- **Fallback behavior**: Returns `needs_ocr` status instead of failing if no text layer.

### Assumptions
- PDFs with text layers are the primary demo target.
- OCR and Vision LLM strategies are stubs returning "not implemented" for now.
- Datasets persist on disk in JSON format for easy debugging.

### Next Steps
- [x] Phase 4: Review + edit endpoints (GET/PUT /datasets/{id})
- [x] Phase 4: Export endpoint (GET /export/{id} → ZIP with CSV/JSON + manifest)

---

## [2026-02-06] Phase 4: Review + Export

### Context
Implement dataset review/edit endpoints and ZIP export with provenance manifest.

### Files Created/Modified
```
backend/app/
├── schemas/
│   ├── dataset.py         # Added EditHistoryEntry, DatasetUpdate
│   └── export.py          # ExportManifest, ExportSource, etc.
├── services/
│   └── extractor.py       # Added list_datasets function
├── routers/
│   ├── review.py          # GET/PUT /datasets/{id}, GET /datasets
│   └── export.py          # GET /export/{id}
├── main.py                # Added review + export routers
docs/
└── phase_4_plan.md        # API contracts + decisions
```

### Commands

```bash
# Run the server
source .venv/bin/activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Get dataset for review
curl http://127.0.0.1:8001/datasets/{dataset_id}

# List all datasets
curl http://127.0.0.1:8001/datasets

# Edit a dataset (update rows)
curl -X PUT http://127.0.0.1:8001/datasets/{dataset_id} \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [
      {"row_id": 1, "Product": "Apple", "Price": "1.99", "Quantity": "100"},
      {"row_id": 2, "Product": "Banana", "Price": "0.75", "Quantity": "200"},
      {"row_id": 3, "Product": "Orange", "Price": "2.00", "Quantity": "150"}
    ]
  }'

# Export as ZIP
curl http://127.0.0.1:8001/export/{dataset_id} --output export.zip

# Verify ZIP contents
unzip -l export.zip
unzip -p export.zip data.csv
unzip -p export.zip manifest.json
```

### Expected Output

**GET /datasets/{id}**:
```json
{
  "id": "ds-92a198fa93d7",
  "job_id": "job-ceb14ad98a53",
  "file_id": "3cb22d4c-027d-4d56-ac81-c2b23e33bbda",
  "page": 1,
  "strategy_used": "pdf_text",
  "created_at": "2026-02-06T00:05:15.419949Z",
  "updated_at": "2026-02-06T00:05:15.419949Z",
  "columns": ["Product", "Price", "Quantity"],
  "rows": [
    {"row_id": 1, "Product": "Apple", "Price": "1.50", "Quantity": "100"},
    {"row_id": 2, "Product": "Banana", "Price": "0.75", "Quantity": "200"},
    {"row_id": 3, "Product": "Orange", "Price": "2.00", "Quantity": "150"}
  ],
  "confidence": 0.8,
  "edit_history": []
}
```

**PUT /datasets/{id}** (after edit):
```json
{
  "id": "ds-92a198fa93d7",
  "updated_at": "2026-02-06T00:55:24.619621Z",
  "columns": ["Product", "Price", "Quantity"],
  "rows": [
    {"row_id": 1, "Product": "Apple", "Price": "1.99", "Quantity": "100"},
    ...
  ],
  "edit_history": [
    {
      "timestamp": "2026-02-06T00:55:24.619621Z",
      "action": "update",
      "changes": {"rows_added": 0, "rows_removed": 0, "rows_modified": 3}
    }
  ]
}
```

**GET /export/{id}** (ZIP contents):
```
Archive:  export.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
       74  2026-02-06 01:55   data.csv
      232  2026-02-06 01:55   data.json
      822  2026-02-06 01:55   manifest.json
---------                     -------
     1128                     3 files
```

**data.csv**:
```csv
Product,Price,Quantity
Apple,1.99,100
Banana,0.75,200
Orange,2.00,150
```

**manifest.json**:
```json
{
  "dataset_id": "ds-92a198fa93d7",
  "exported_at": "2026-02-06T00:55:39.326711Z",
  "source": {
    "file_id": "3cb22d4c-027d-4d56-ac81-c2b23e33bbda",
    "filename": "table_sample.pdf",
    "page": 1
  },
  "extraction": {
    "job_id": "job-ceb14ad98a53",
    "strategy": "pdf_text",
    "extracted_at": "2026-02-06T00:05:15.419949Z",
    "confidence": 0.8
  },
  "data": {
    "columns": ["Product", "Price", "Quantity"],
    "row_count": 3
  },
  "edits": {
    "total_edits": 1,
    "last_edited_at": "2026-02-06T00:55:24.619621Z",
    "history": [...]
  }
}
```

**Dataset not found** (404):
```json
{"detail": "Dataset not found: nonexistent"}
```

### Decisions
- **Full row replacement**: PUT replaces all rows (simpler than PATCH for MVP).
- **Edit history**: Append-only log tracks columns added/removed, rows modified.
- **ZIP export**: Always includes manifest.json; CSV and JSON are optional via `?formats=`.
- **Clean JSON export**: Removes `row_id` from exported JSON for cleaner output.

### Assumptions
- Single-user mode; no concurrent edit conflicts.
- Edit history is append-only, never pruned.
- Export is synchronous (fast enough for demo datasets).

### Summary
All 4 phases complete:
- ✅ Phase 1: Foundation (health, CORS, docs)
- ✅ Phase 2: Upload + Storage (POST/GET /files)
- ✅ Phase 3: Scope + Extraction (preview, extract, jobs)
- ✅ Phase 4: Review + Export (datasets, edit history, ZIP)
