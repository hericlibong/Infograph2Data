# Backend Test Plan

> Created: 2026-02-06
> Status: DRAFT — Awaiting validation before implementation

---

## A) Test Strategy Overview

### Scope: What We Test

| Layer | In Scope | Notes |
|-------|----------|-------|
| **API Endpoints** | All routes (health, upload, extraction, review, export) | Via FastAPI TestClient |
| **Services** | `storage.py`, `extractor.py`, `pdf.py` | Unit tests with fixtures |
| **Schemas** | Pydantic models validation | Unit tests for edge cases |
| **Integration** | Full request → storage → response flows | With temp filesystem |
| **Happy Path E2E** | Upload → Extract → Edit → Export | Single comprehensive test |

### Scope: What We Explicitly Do NOT Test (For Now)

| Excluded | Reason |
|----------|--------|
| OCR extraction (`ocr.py`) | Not implemented; stub only |
| Vision LLM extraction | Not implemented; requires API keys |
| Frontend integration | Backend-only scope |
| Performance/load testing | Not a priority for hackathon MVP |
| Authentication/authorization | Not implemented (single-user mode) |
| Concurrent access | Not a priority; single-user assumption |

### Test Types

| Type | Purpose | Tools | Isolation |
|------|---------|-------|-----------|
| **Unit** | Test individual functions in isolation | `pytest` | Mocked dependencies |
| **Integration** | Test API endpoints with real storage | `pytest` + `TestClient` | Temp directory |
| **E2E Happy Path** | Verify complete user workflow | `pytest` + `TestClient` | Temp directory |

### Filesystem Storage in Tests

**Problem**: Tests must not pollute the real `backend/app/storage/` directory.

**Solution**: Override `settings.storage_dir` to use a temporary directory per test session.

```python
# Fixture approach (pseudocode)
@pytest.fixture
def temp_storage(tmp_path, monkeypatch):
    """Override storage directory for test isolation."""
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    yield tmp_path / "storage"
    # Cleanup is automatic (pytest tmp_path)
```

**Rules**:
1. Every test that touches storage MUST use the `temp_storage` fixture.
2. Tests must NOT rely on state from previous tests (isolation).
3. Temp directories are auto-cleaned by pytest's `tmp_path`.

---

## B) Test Matrix

### Legend
- **U** = Unit test
- **I** = Integration test
- **E** = End-to-end test

---

### Health Endpoint

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_health_returns_ok` | I | `GET /health` | Request health endpoint | 200 OK, `{"status": "healthy", "version": "0.1.0"}` | `client` | Baseline sanity check |

---

### Upload Endpoints (`/files`)

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_upload_pdf_success` | I | `POST /files` | Upload valid 1-page PDF | 201, returns `id`, `filename`, `pages=1`, `mime_type` | `client`, `temp_storage`, `sample_pdf` | Verifies file saved to disk |
| `test_upload_png_success` | I | `POST /files` | Upload valid PNG image | 201, returns metadata with `pages=None` | `client`, `temp_storage`, `sample_png` | Images have no page count |
| `test_upload_jpeg_success` | I | `POST /files` | Upload valid JPEG image | 201, returns metadata | `client`, `temp_storage`, `sample_jpeg` | |
| `test_upload_invalid_mime_type` | I | `POST /files` | Upload .txt file | 400, `"Unsupported file type"` | `client`, `temp_storage` | Rejection works |
| `test_upload_empty_file` | I | `POST /files` | Upload 0-byte file | 400 or appropriate error | `client`, `temp_storage` | Edge case |
| `test_get_file_metadata` | I | `GET /files/{id}` | Retrieve uploaded file metadata | 200, matches upload response | `client`, `temp_storage`, `uploaded_pdf` | Depends on prior upload |
| `test_get_file_not_found` | I | `GET /files/{id}` | Request non-existent ID | 404, `"File not found"` | `client`, `temp_storage` | |
| `test_list_files_empty` | I | `GET /files` | List with no uploads | 200, `[]` | `client`, `temp_storage` | |
| `test_list_files_multiple` | I | `GET /files` | List after 2 uploads | 200, array with 2 items, newest first | `client`, `temp_storage` | Order matters |

---

### Storage Service (`storage.py`)

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_save_file_creates_directory` | U | `save_file()` | Save new file | Creates `{uuid}/metadata.json` + `original.pdf` | `temp_storage` | Verify directory structure |
| `test_get_file_metadata_returns_correct_data` | U | `get_file_metadata()` | Load saved metadata | Returns `FileMetadata` matching saved | `temp_storage` | |
| `test_get_file_metadata_not_found` | U | `get_file_metadata()` | Load non-existent ID | Returns `None` | `temp_storage` | |
| `test_get_file_path_returns_correct_path` | U | `get_file_path()` | Get path for saved file | Returns `Path` to `original.<ext>` | `temp_storage` | |
| `test_is_allowed_mime_type` | U | `is_allowed_mime_type()` | Check allowed types | `True` for pdf/png/jpeg, `False` otherwise | None | Pure function, no fixtures |
| `test_list_files_sorted_by_date` | U | `list_files()` | List multiple files | Returns newest first | `temp_storage` | |

---

### PDF Service (`pdf.py`)

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_get_page_count` | U | `get_page_count()` | Count pages in 3-page PDF | Returns `3` | `sample_pdf_3pages` | |
| `test_get_pages_info` | U | `get_pages_info()` | Get info for all pages | Returns list with width/height/has_text | `sample_pdf_with_text` | |
| `test_render_page_png` | U | `render_page()` | Render page 1 as PNG | Returns PNG bytes, correct content-type | `sample_pdf` | Verify output is valid PNG |
| `test_render_page_jpeg` | U | `render_page()` | Render page 1 as JPEG | Returns JPEG bytes | `sample_pdf` | |
| `test_render_page_with_scale` | U | `render_page()` | Render at scale=2.0 | Dimensions are 2x default | `sample_pdf` | |
| `test_render_page_out_of_range` | U | `render_page()` | Request page 99 | Raises `ValueError` | `sample_pdf` | |
| `test_extract_text_blocks` | U | `extract_text_blocks()` | Extract from PDF with text | Returns list of blocks with positions | `sample_pdf_with_text` | |
| `test_extract_text_blocks_with_bbox` | U | `extract_text_blocks()` | Extract with bbox filter | Only returns blocks in bbox | `sample_pdf_with_text` | |
| `test_extract_page_text` | U | `extract_page_text()` | Extract full page text | Returns text string | `sample_pdf_with_text` | |
| `test_page_has_text_true` | U | `page_has_text()` | Check page with text | Returns `True` | `sample_pdf_with_text` | |
| `test_page_has_text_false` | U | `page_has_text()` | Check blank page | Returns `False` | `sample_pdf_blank` | |

---

### Extraction Endpoints (`/extract`, `/jobs`)

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_get_pages_info_endpoint` | I | `GET /files/{id}/pages` | Get page info for PDF | 200, returns pages array with dimensions | `client`, `temp_storage`, `uploaded_pdf` | |
| `test_get_pages_not_pdf` | I | `GET /files/{id}/pages` | Request pages for PNG | 400, `"File is not a PDF"` | `client`, `temp_storage`, `uploaded_png` | |
| `test_preview_page_png` | I | `GET /files/{id}/pages/1/preview` | Preview page 1 | 200, `image/png` content | `client`, `temp_storage`, `uploaded_pdf` | |
| `test_preview_page_jpeg` | I | `GET /files/{id}/pages/1/preview?format=jpeg` | Preview as JPEG | 200, `image/jpeg` content | `client`, `temp_storage`, `uploaded_pdf` | |
| `test_preview_page_with_scale` | I | `GET /files/{id}/pages/1/preview?scale=2` | Preview at 2x | 200, larger image dimensions | `client`, `temp_storage`, `uploaded_pdf` | |
| `test_preview_page_out_of_range` | I | `GET /files/{id}/pages/99/preview` | Invalid page number | 400, `"Page X out of range"` | `client`, `temp_storage`, `uploaded_pdf` | |
| `test_extract_pdf_with_text` | I | `POST /extract` | Extract from PDF with text | 202, `status=completed`, dataset created | `client`, `temp_storage`, `uploaded_table_pdf` | Core extraction test |
| `test_extract_pdf_no_text` | I | `POST /extract` | Extract from blank PDF | 202, `status=needs_ocr` | `client`, `temp_storage`, `uploaded_blank_pdf` | Fallback behavior |
| `test_extract_file_not_found` | I | `POST /extract` | Invalid file_id | 404 | `client`, `temp_storage` | |
| `test_extract_page_out_of_range` | I | `POST /extract` | Page > total pages | 400 | `client`, `temp_storage`, `uploaded_pdf` | |
| `test_get_job_status` | I | `GET /jobs/{job_id}` | Get completed job | 200, returns logs, strategy_used, timestamps | `client`, `temp_storage`, `completed_job` | |
| `test_get_job_not_found` | I | `GET /jobs/{job_id}` | Invalid job_id | 404 | `client`, `temp_storage` | |

---

### Extractor Service (`extractor.py`)

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_parse_table_tab_delimited` | U | `parse_table_from_text()` | Tab-separated text | Correct columns and rows | None | Pure function |
| `test_parse_table_pipe_delimited` | U | `parse_table_from_text()` | Pipe-separated text | Correct columns and rows | None | |
| `test_parse_table_space_delimited` | U | `parse_table_from_text()` | Multi-space separated | Correct columns and rows | None | |
| `test_parse_table_key_value` | U | `parse_table_from_text()` | `Key: Value` lines | Returns Key/Value columns | None | |
| `test_parse_table_fallback` | U | `parse_table_from_text()` | Plain text lines | Single "Text" column | None | |
| `test_save_and_load_dataset` | U | `save_dataset()`, `load_dataset()` | Round-trip dataset | Loaded matches saved | `temp_storage` | |
| `test_save_and_load_job` | U | `save_job()`, `load_job()` | Round-trip job | Loaded matches saved | `temp_storage` | |
| `test_list_datasets` | U | `list_datasets()` | Multiple datasets | Returns all, sorted by date | `temp_storage` | |
| `test_run_extraction_auto_strategy` | U | `run_extraction()` | PDF with text | Uses pdf_text, creates dataset | `temp_storage`, `sample_pdf_with_text` | |
| `test_run_extraction_needs_ocr` | U | `run_extraction()` | PDF without text | Status = needs_ocr | `temp_storage`, `sample_pdf_blank` | |

---

### Review Endpoints (`/datasets`)

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_get_dataset` | I | `GET /datasets/{id}` | Get extracted dataset | 200, returns columns, rows, metadata | `client`, `temp_storage`, `extracted_dataset` | |
| `test_get_dataset_not_found` | I | `GET /datasets/{id}` | Invalid dataset_id | 404 | `client`, `temp_storage` | |
| `test_list_datasets_empty` | I | `GET /datasets` | No datasets | 200, `[]` | `client`, `temp_storage` | |
| `test_list_datasets_multiple` | I | `GET /datasets` | Multiple datasets | 200, array sorted by date | `client`, `temp_storage` | |
| `test_update_dataset_rows` | I | `PUT /datasets/{id}` | Update rows | 200, rows updated, edit_history appended | `client`, `temp_storage`, `extracted_dataset` | |
| `test_update_dataset_columns` | I | `PUT /datasets/{id}` | Add a column | 200, columns updated, history tracks addition | `client`, `temp_storage`, `extracted_dataset` | |
| `test_update_dataset_not_found` | I | `PUT /datasets/{id}` | Invalid dataset_id | 404 | `client`, `temp_storage` | |
| `test_edit_history_appends` | I | `PUT /datasets/{id}` (2x) | Two sequential edits | edit_history has 2 entries | `client`, `temp_storage`, `extracted_dataset` | |

---

### Export Endpoints (`/export`)

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_export_zip_default` | I | `GET /export/{id}` | Export dataset | 200, ZIP with data.csv, data.json, manifest.json | `client`, `temp_storage`, `extracted_dataset` | |
| `test_export_zip_csv_only` | I | `GET /export/{id}?formats=csv` | Export CSV only | ZIP with data.csv + manifest.json (no data.json) | `client`, `temp_storage`, `extracted_dataset` | |
| `test_export_zip_json_only` | I | `GET /export/{id}?formats=json` | Export JSON only | ZIP with data.json + manifest.json (no data.csv) | `client`, `temp_storage`, `extracted_dataset` | |
| `test_export_csv_content` | I | `GET /export/{id}` | Verify CSV format | CSV has header + correct rows | `client`, `temp_storage`, `extracted_dataset` | Parse and validate |
| `test_export_json_content` | I | `GET /export/{id}` | Verify JSON format | JSON array without row_id | `client`, `temp_storage`, `extracted_dataset` | |
| `test_export_manifest_provenance` | I | `GET /export/{id}` | Verify manifest | Contains source, extraction, edits info | `client`, `temp_storage`, `extracted_dataset` | |
| `test_export_not_found` | I | `GET /export/{id}` | Invalid dataset_id | 404 | `client`, `temp_storage` | |
| `test_export_after_edit` | I | `GET /export/{id}` | Export after editing | manifest.edits reflects changes | `client`, `temp_storage`, `edited_dataset` | |

---

### End-to-End Happy Path

| Test ID | Type | Target | Scenario | Expected Result | Fixtures | Notes |
|---------|------|--------|----------|-----------------|----------|-------|
| `test_e2e_upload_extract_edit_export` | E | Full workflow | 1. Upload PDF<br>2. Get pages<br>3. Extract<br>4. Edit row<br>5. Export ZIP | Each step succeeds, final ZIP has edited data + provenance | `client`, `temp_storage`, `table_pdf_bytes` | Single comprehensive test |

---

## C) Documentation Protocol for Tests

### Test Module Header

Every test file should start with a docstring explaining:

```python
"""
Tests for [module/feature name].

This module tests:
- [Bullet 1: what is tested]
- [Bullet 2: what is tested]

Fixtures required:
- client: FastAPI TestClient
- temp_storage: Isolated temporary storage directory

Not tested here:
- [Explicitly list what is out of scope]
"""
```

### Test Function Docstrings

Each test should have a docstring in Given/When/Then format:

```python
def test_upload_pdf_success(client, temp_storage, sample_pdf):
    """
    Upload a valid PDF file successfully.

    Given: A valid single-page PDF file
    When: POST /files with the PDF as multipart form data
    Then: Returns 201 with file metadata including pages=1
    
    Proves: Basic upload flow works, PDF page counting works.
    """
```

### Naming Conventions

| Convention | Pattern | Example |
|------------|---------|---------|
| Test files | `test_{module}.py` | `test_upload.py`, `test_storage.py` |
| Test functions | `test_{action}_{scenario}` | `test_upload_pdf_success` |
| Fixtures | `{resource}` or `{resource}_{variant}` | `sample_pdf`, `sample_pdf_3pages` |
| Fixture files | `conftest.py` | Shared fixtures in `tests/conftest.py` |

### Directory Structure

```
tests/
├── conftest.py              # Shared fixtures (client, temp_storage, sample files)
├── unit/
│   ├── __init__.py
│   ├── test_storage.py      # storage.py unit tests
│   ├── test_pdf.py          # pdf.py unit tests
│   ├── test_extractor.py    # extractor.py unit tests (parse functions)
│   └── test_schemas.py      # Pydantic model validation tests
├── integration/
│   ├── __init__.py
│   ├── test_health.py       # Health endpoint
│   ├── test_upload.py       # Upload endpoints
│   ├── test_extraction.py   # Extraction + jobs endpoints
│   ├── test_review.py       # Dataset review endpoints
│   └── test_export.py       # Export endpoint
└── e2e/
    ├── __init__.py
    └── test_happy_path.py   # Full workflow test
```

---

## D) CI Suggestion (GitHub Actions)

### Minimal Workflow: `.github/workflows/test.yml`

```yaml
name: Backend Tests

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'tests/**'
      - 'pyproject.toml'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'
      - 'tests/**'
      - 'pyproject.toml'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"

      - name: Run tests with coverage
        run: |
          pytest tests/ \
            -v \
            --tb=short \
            --cov=backend \
            --cov-report=term-missing \
            --cov-fail-under=80 \
            --durations=10 \
            --junitxml=test-results.xml

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results.xml
```

### Notes on CI

1. **Triggers**: Runs on push/PR to `main` when backend or test files change.
2. **Coverage required**: Build fails if coverage < 80%.
3. **No external services**: All tests are self-contained (no OCR/LLM APIs).
4. **Fast feedback**: Tests should complete in <60 seconds.

---

## E) Fixtures Summary

### Shared Fixtures (`conftest.py`)

| Fixture | Scope | Description |
|---------|-------|-------------|
| `client` | function | FastAPI `TestClient` instance |
| `temp_storage` | function | Overrides `settings.storage_dir` to temp directory |
| `sample_pdf` | session | 1-page PDF bytes (minimal) |
| `sample_pdf_3pages` | session | 3-page PDF bytes |
| `sample_pdf_with_text` | session | PDF with extractable table text |
| `sample_pdf_blank` | session | PDF with no text layer |
| `sample_png` | session | Valid PNG image bytes |
| `sample_jpeg` | session | Valid JPEG image bytes |
| `table_pdf_bytes` | session | PDF with tab-delimited table for E2E |

### Composite Fixtures

| Fixture | Depends On | Description |
|---------|------------|-------------|
| `uploaded_pdf` | `client`, `temp_storage`, `sample_pdf` | Pre-uploaded PDF, returns file_id |
| `uploaded_table_pdf` | `client`, `temp_storage`, `sample_pdf_with_text` | Pre-uploaded table PDF |
| `extracted_dataset` | `uploaded_table_pdf` | Pre-extracted dataset, returns dataset_id |
| `edited_dataset` | `extracted_dataset` | Dataset with one edit applied |
| `completed_job` | `extracted_dataset` | Returns job_id from extraction |

---

## F) Test Count Summary

| Category | Count |
|----------|-------|
| Health | 1 |
| Upload (integration) | 9 |
| Storage (unit) | 6 |
| PDF (unit) | 11 |
| Extraction (integration) | 12 |
| Extractor (unit) | 10 |
| Review (integration) | 8 |
| Export (integration) | 8 |
| E2E | 1 |
| **Total** | **66** |

---

## Approval Checklist

Before implementation, confirm:

- [ ] Test scope is appropriate (no OCR/LLM)
- [ ] Fixture strategy (temp_storage override) is acceptable
- [ ] Test matrix covers critical paths
- [ ] Documentation protocol is clear
- [ ] CI workflow meets needs
- [ ] Directory structure is approved
- [ ] Coverage threshold (80%) is acceptable
- [ ] Test run commands are approved

---

## G) Test Run Commands

### Local Development — Full Test Suite

```bash
# Activate virtual environment
source .venv/bin/activate

# Full test run with verbose output + coverage + missing lines + slowest tests
pytest tests/ \
  -v \
  --tb=short \
  --cov=backend \
  --cov-report=term-missing \
  --cov-fail-under=80 \
  --durations=10
```

**Flags explained**:

| Flag | Purpose |
|------|---------|
| `-v` | Verbose: show each test name and PASSED/FAILED status |
| `--tb=short` | Short traceback on failures (readable, not overwhelming) |
| `--cov=backend` | Measure coverage for `backend/` package |
| `--cov-report=term-missing` | Terminal report showing which lines are NOT covered |
| `--cov-fail-under=80` | **Fail if coverage < 80%** |
| `--durations=10` | Show 10 slowest tests (performance awareness) |

### Local Development — Quick Check (No Coverage)

```bash
# Fast feedback during development
pytest tests/ -v --tb=short
```

### Local Development — Single Test File

```bash
# Run only upload tests
pytest tests/integration/test_upload.py -v --tb=short

# Run only unit tests
pytest tests/unit/ -v --tb=short
```

### Local Development — Run with Coverage HTML Report

```bash
# Generate HTML coverage report for detailed inspection
pytest tests/ \
  --cov=backend \
  --cov-report=html \
  --cov-report=term-missing \
  --cov-fail-under=80

# Open report (macOS/Linux)
open htmlcov/index.html  # or: xdg-open htmlcov/index.html
```

### CI Command (GitHub Actions)

```bash
pytest tests/ \
  -v \
  --tb=short \
  --cov=backend \
  --cov-report=term-missing \
  --cov-fail-under=80 \
  --durations=10 \
  --junitxml=test-results.xml
```

**Additional CI flag**:
- `--junitxml=test-results.xml`: Produces JUnit XML for CI dashboards (optional but useful).

---

## H) Coverage Policy

### Threshold

| Metric | Requirement |
|--------|-------------|
| **Line coverage** | **≥ 80%** |
| Enforcement | `--cov-fail-under=80` (pytest-cov) |
| Failure behavior | Exit code 1 if coverage < 80% |

### Exclusions

Files excluded from coverage measurement:

| Pattern | Reason |
|---------|--------|
| `*/__init__.py` | Package markers, no logic |
| `*/conftest.py` | Test fixtures, not production code |
| `tests/*` | Test code itself |

**Coverage configuration** (to add in `pyproject.toml`):

```toml
[tool.coverage.run]
source = ["backend"]
omit = [
    "*/__init__.py",
    "*/conftest.py",
    "tests/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
fail_under = 80
show_missing = true
```

### What Counts Toward Coverage

| Included | Excluded |
|----------|----------|
| `backend/app/main.py` | `backend/app/__init__.py` |
| `backend/app/config.py` | Test files |
| `backend/app/routers/*.py` | |
| `backend/app/services/*.py` | |
| `backend/app/schemas/*.py` | |

---

## I) Expected Terminal Output

### Successful Run (All Tests Pass, Coverage ≥ 80%)

```
$ pytest tests/ -v --tb=short --cov=backend --cov-report=term-missing --cov-fail-under=80 --durations=10

========================= test session starts ==========================
platform linux -- Python 3.12.x, pytest-8.x.x, pluggy-1.x.x
rootdir: /path/to/infograph2data
plugins: cov-4.x.x, anyio-4.x.x
collected 66 items

tests/unit/test_storage.py::test_save_file_creates_directory PASSED
tests/unit/test_storage.py::test_get_file_metadata_returns_correct_data PASSED
tests/unit/test_storage.py::test_get_file_metadata_not_found PASSED
...
tests/integration/test_upload.py::test_upload_pdf_success PASSED
tests/integration/test_upload.py::test_upload_invalid_mime_type PASSED
...
tests/integration/test_export.py::test_export_zip_default PASSED
tests/e2e/test_happy_path.py::test_e2e_upload_extract_edit_export PASSED

---------- coverage: platform linux, python 3.12.x -----------
Name                                    Stmts   Miss  Cover   Missing
---------------------------------------------------------------------
backend/app/config.py                      12      0   100%
backend/app/main.py                        15      0   100%
backend/app/routers/export.py              45      3    93%   78-80
backend/app/routers/extraction.py          62      5    92%   45, 67-70
backend/app/routers/health.py               8      0   100%
backend/app/routers/review.py              38      2    95%   55-56
backend/app/routers/upload.py              28      0   100%
backend/app/schemas/dataset.py             22      0   100%
backend/app/schemas/export.py              18      0   100%
backend/app/schemas/extraction.py          35      0   100%
backend/app/schemas/upload.py              12      0   100%
backend/app/services/extractor.py          95      8    92%   120-127
backend/app/services/pdf.py                58      4    93%   85-88
backend/app/services/storage.py            42      2    95%   67-68
---------------------------------------------------------------------
TOTAL                                     490     24    95%

Required coverage of 80% reached. Total coverage: 95.10%

=========================== slowest 10 durations ===========================
0.15s call     tests/integration/test_extraction.py::test_extract_pdf_with_text
0.12s call     tests/e2e/test_happy_path.py::test_e2e_upload_extract_edit_export
0.08s call     tests/integration/test_export.py::test_export_zip_default
...

========================= 66 passed in 3.45s =============================
```

### Failed Run (Test Failure)

```
$ pytest tests/ -v --tb=short ...

tests/integration/test_upload.py::test_upload_pdf_success FAILED

=========================== FAILURES ===================================
_________________ test_upload_pdf_success ______________________________

    def test_upload_pdf_success(client, temp_storage, sample_pdf):
>       response = client.post("/files", files={"file": ...})
E       AssertionError: assert 500 == 201

tests/integration/test_upload.py:25: AssertionError
========================= 1 failed, 65 passed in 3.20s =================
```

### Failed Run (Coverage Below Threshold)

```
$ pytest tests/ -v --tb=short --cov=backend --cov-fail-under=80 ...

---------- coverage: platform linux, python 3.12.x -----------
Name                                    Stmts   Miss  Cover   Missing
---------------------------------------------------------------------
...
---------------------------------------------------------------------
TOTAL                                     490    120    75%

FAIL Required test coverage of 80% not reached. Total coverage: 75.51%

========================= 66 passed in 3.45s =============================
$ echo $?
1
```

---

## J) Definition of "Passing"

### Passing Checklist

A test run is considered **PASSING** if and only if:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | **All tests pass** | `66 passed` (0 failed, 0 errors) |
| 2 | **Coverage ≥ 80%** | `Required coverage of 80% reached` |
| 3 | **No warnings blocking** | Warnings are acceptable, errors are not |
| 4 | **Exit code 0** | `echo $?` returns `0` |

### CI Pass/Fail

| Outcome | Exit Code | GitHub Actions |
|---------|-----------|----------------|
| All tests pass + coverage ≥ 80% | 0 | ✅ Green check |
| Any test fails | 1 | ❌ Red X |
| Coverage < 80% | 1 | ❌ Red X |

---

**Awaiting validation to proceed with test implementation.**
