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

---

## [2026-02-06] Backend Test Suite Implementation

### Context
Implement comprehensive test suite following docs/test_plan.md. Coverage gate: 80% minimum.

### Files Created/Modified
```
tests/
├── conftest.py              # Shared fixtures (client, temp_storage, sample files)
├── unit/
│   ├── __init__.py
│   ├── test_storage.py      # 17 tests - storage service
│   ├── test_pdf.py          # 17 tests - PDF service
│   └── test_extractor.py    # 15 tests - extractor service
├── integration/
│   ├── __init__.py
│   ├── test_health.py       # 1 test - health endpoint
│   ├── test_upload.py       # 9 tests - upload endpoints
│   ├── test_extraction.py   # 14 tests - extraction endpoints
│   ├── test_review.py       # 8 tests - review endpoints
│   └── test_export.py       # 8 tests - export endpoints
└── e2e/
    ├── __init__.py
    └── test_happy_path.py   # 1 test - complete workflow
pyproject.toml               # Added pytest-cov, coverage config
docs/test_plan.md            # Updated with commands + coverage policy
```

### Commands

```bash
# Activate virtual environment
source .venv/bin/activate

# Install dev dependencies (includes pytest-cov)
pip install -e ".[dev]"

# Run full test suite with coverage (MAIN COMMAND)
pytest tests/ \
  -v \
  --tb=short \
  --cov=backend \
  --cov-report=term-missing \
  --cov-fail-under=80 \
  --durations=10

# Quick test run (no coverage)
pytest tests/ -v --tb=short

# Run specific test file
pytest tests/integration/test_upload.py -v

# Run with HTML coverage report
pytest tests/ --cov=backend --cov-report=html
open htmlcov/index.html
```

### Expected Output

```
=================== test session starts ====================
platform linux -- Python 3.12.3, pytest-9.0.2
plugins: cov-7.0.0, anyio-4.12.1
collected 93 items

tests/e2e/test_happy_path.py::TestEndToEndHappyPath::test_e2e_upload_extract_edit_export PASSED
tests/integration/test_export.py::TestExportDataset::test_export_zip_default PASSED
...
tests/unit/test_storage.py::TestListFiles::test_list_files_sorted_by_date PASSED

==================== tests coverage ========================
Name                                Stmts   Miss  Cover   Missing
-----------------------------------------------------------------
backend/app/config.py                  12      0   100%
backend/app/main.py                    11      0   100%
backend/app/routers/export.py          53      0   100%
backend/app/routers/extraction.py      53      4    92%   41, 76, 89, 123
backend/app/routers/health.py           6      0   100%
backend/app/routers/review.py          44      1    98%   77
backend/app/routers/upload.py          23      1    96%   34
backend/app/schemas/dataset.py         33      0   100%
backend/app/schemas/export.py          26      0   100%
backend/app/schemas/extraction.py      44      0   100%
backend/app/schemas/upload.py          11      0   100%
backend/app/services/extractor.py     166     34    80%   ...
backend/app/services/pdf.py            56      3    95%   88, 145-146
backend/app/services/storage.py        64      6    91%   ...
-----------------------------------------------------------------
TOTAL                                 602     49    92%
Required test coverage of 80% reached. Total coverage: 91.86%

=============== slowest 10 durations =======================
0.10s call  tests/e2e/test_happy_path.py::...
0.05s call  tests/integration/test_extraction.py::...
...

=============== 93 passed, 1 warning in 1.66s ==============
```

### Test Summary

| Category | Tests | Status |
|----------|-------|--------|
| Unit: Storage | 17 | ✅ |
| Unit: PDF | 17 | ✅ |
| Unit: Extractor | 15 | ✅ |
| Integration: Health | 1 | ✅ |
| Integration: Upload | 9 | ✅ |
| Integration: Extraction | 14 | ✅ |
| Integration: Review | 8 | ✅ |
| Integration: Export | 8 | ✅ |
| E2E: Happy Path | 1 | ✅ |
| **Total** | **93** | **✅ All Pass** |

### Coverage Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Coverage | 91.86% | ✅ ≥ 80% |
| Threshold | 80% | Enforced |
| Exit Code | 0 | ✅ Pass |

### Decisions
- Used `asyncio.run()` for async function tests instead of pytest-asyncio (simpler, no extra dependency).
- Fixtures use `tmp_path` for automatic cleanup.
- Session-scoped fixtures for sample files (performance).
- Given/When/Then docstrings for clarity.

### Assumptions
- All tests are deterministic and isolated.
- No external services (OCR/LLM) tested.
- Coverage exclusions: `__init__.py`, test files.

### Next Steps
- [ ] Frontend implementation (Vite/React)
- [ ] CI pipeline (GitHub Actions)

---

## [2026-02-08] Phase 5 — Vision LLM Extraction Implemented

### Context
Implemented two-step Vision LLM extraction workflow to extract data from infographics and charts using GPT-4o. This adds the core extraction capability that was missing (previous extraction only worked on PDFs with text layers).

### Branch
`feature/phase-5-vision-llm`

### Files Created
```
backend/app/
├── schemas/
│   └── identification.py   # Pydantic models for identification workflow
├── services/
│   └── vision.py           # Vision LLM service (OpenAI integration)
└── routers/
    └── identify.py         # POST /extract/identify, GET /extract/identify/{id}, POST /extract/run

tests/
├── unit/
│   └── test_vision.py      # 17 unit tests for vision service
└── integration/
    └── test_identify.py    # 14 integration tests for identify endpoints
```

### Files Modified
```
.env.example                # Added OPENAI_API_KEY, OPENAI_MODEL, VISION_TIMEOUT, IDENTIFICATION_TTL
backend/app/config.py       # Added OpenAI settings
backend/app/main.py         # Registered identify router
pyproject.toml              # Added openai>=1.12.0 dependency
docs/phase_5_plan.md        # Full API contract and design
```

### Commands to Verify
```bash
# Install new dependency
pip install -e .

# Run all tests with coverage
pytest tests/ -v --tb=short --cov=backend --cov-report=term-missing --cov-fail-under=80

# Expected output: 124 passed, 92% coverage
```

### API Endpoints Added

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/extract/identify` | Step 1: Identify visual elements in image/PDF |
| GET | `/extract/identify/{id}` | Retrieve existing identification |
| POST | `/extract/run` | Step 2: Extract data from selected items |

### Two-Step Workflow
1. **Identify**: Vision LLM detects elements (charts, tables, KPIs), returns type/title/bbox/confidence
2. **Confirm**: User selects/modifies/adds items
3. **Extract**: Vision LLM extracts structured data from confirmed items

### Supported Element Types
- `bar_chart`, `grouped_bar_chart`, `stacked_bar_chart`
- `line_chart`, `multi_line_chart`
- `pie_chart`, `table`, `kpi_panel`, `map_data`, `other`

### Test Results
```
124 passed, 92% coverage
- Unit tests: 17 vision service tests (mocked OpenAI)
- Integration tests: 14 identify endpoint tests (mocked)
- All previous tests still passing
```

### Decisions
- Used GPT-4o (configurable via OPENAI_MODEL env var)
- Identifications expire after IDENTIFICATION_TTL seconds (default 3600)
- User can modify title/type, add new items with manual bbox
- Optional merge_datasets flag to combine multiple extractions

### Next Steps
- [ ] Test with real OpenAI API on demo assets
- [ ] Merge to main after validation
- [ ] Frontend integration for element selection UI

---

## [2026-02-08] Phase 5 — Granularity Options Added

### Context
Added extraction granularity options to control how data is extracted from time series charts. Users can now choose between annotated-only values, full granular data, or full data with source tracking.

### New Feature: `options.granularity`

| Option | Rows | Description |
|--------|------|-------------|
| `annotated_only` | ~4 | Only explicitly labeled values |
| `full` | ~37 | All data points (monthly for time series) |
| `full_with_source` | ~37 | All data + `source` column (annotated/estimated) |

### API Usage
```json
POST /extract/run
{
  "identification_id": "ident-xyz",
  "items": [{"item_id": "item-1"}],
  "options": {
    "granularity": "full_with_source"
  }
}
```

### Example Output (`full_with_source`)
```json
{
  "columns": ["Year", "Month", "Cases", "source"],
  "rows": [
    {"Year": 2023, "Month": "Jan", "Cases": 0, "source": "estimated"},
    {"Year": 2023, "Month": "Aug", "Cases": 63, "source": "annotated"}
  ]
}
```

### Files Modified
```
backend/app/schemas/identification.py  # Added Granularity enum, ExtractionOptions
backend/app/services/vision.py         # 3 specialized prompts per granularity
docs/phase_5_plan.md                   # Updated with granularity documentation
```

### Commands to Test
```bash
# annotated_only - only labeled values
curl -X POST "http://127.0.0.1:8001/extract/run" \
  -H "Content-Type: application/json" \
  -d '{"identification_id": "...", "items": [...], "options": {"granularity": "annotated_only"}}'

# full_with_source - all values with source tracking
curl -X POST "http://127.0.0.1:8001/extract/run" \
  -H "Content-Type: application/json" \
  -d '{"identification_id": "...", "items": [...], "options": {"granularity": "full_with_source"}}'
```

### Value for Human-in-the-Loop
The `source` column enables the Review UI to:
- Highlight estimated values (need verification)
- Show annotated values as trusted
- Focus user attention on uncertain data points
