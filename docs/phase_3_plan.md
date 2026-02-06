# Phase 3: Scope + Extraction Logic

> Created: 2026-02-05

## Goal

Enable PDF page previews for scoping, implement extraction job API, and create a minimum viable `auto` extraction strategy.

---

## API Contracts

### GET /files/{id}/pages

Get page information for a PDF file.

**Response**: `200 OK`
```json
{
  "file_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "filename": "chart.pdf",
  "total_pages": 3,
  "pages": [
    {"page": 1, "width": 612, "height": 792, "has_text": true},
    {"page": 2, "width": 612, "height": 792, "has_text": true},
    {"page": 3, "width": 612, "height": 792, "has_text": false}
  ]
}
```

**Errors**:
| Status | Reason |
|--------|--------|
| `404` | File not found |
| `400` | File is not a PDF |

---

### GET /files/{id}/pages/{page}/preview

Render a PDF page as an image.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `scale` | float | 1.5 | Render scale (1.0 = 72 DPI, 2.0 = 144 DPI) |
| `format` | string | `png` | Output format: `png` or `jpeg` |

**Response**: `200 OK`
- Content-Type: `image/png` or `image/jpeg`
- Body: Raw image bytes

**Errors**:
| Status | Reason |
|--------|--------|
| `404` | File not found |
| `400` | File is not a PDF |
| `400` | Page out of range |

---

### POST /extract

Start an extraction job.

**Request**: `application/json`
```json
{
  "file_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "page": 1,
  "bbox": [100, 200, 400, 500],
  "strategy": "auto"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file_id` | string | Yes | UUID of uploaded file |
| `page` | int | Yes (PDF) | Page number (1-indexed) |
| `bbox` | array | No | Bounding box [x1, y1, x2, y2] in PDF points |
| `strategy` | string | No | Extraction strategy: `auto`, `pdf_text`, `ocr`, `vision_llm` |

**Response**: `202 Accepted`
```json
{
  "job_id": "job-1234-5678",
  "dataset_id": "ds-abcd-efgh",
  "status": "pending",
  "created_at": "2026-02-05T23:00:00Z"
}
```

---

### GET /jobs/{job_id}

Get extraction job status.

**Response**: `200 OK`
```json
{
  "job_id": "job-1234-5678",
  "dataset_id": "ds-abcd-efgh",
  "status": "completed",
  "strategy_used": "pdf_text",
  "created_at": "2026-02-05T23:00:00Z",
  "completed_at": "2026-02-05T23:00:02Z",
  "error": null,
  "logs": [
    "Extracting text from page 1",
    "Found 15 text blocks",
    "Parsed 5 rows with 3 columns"
  ]
}
```

**Status values**:
| Status | Description |
|--------|-------------|
| `pending` | Job queued |
| `running` | Extraction in progress |
| `completed` | Successfully extracted |
| `failed` | Extraction failed (see `error`) |
| `needs_ocr` | PDF has no text layer, needs OCR |
| `needs_vision` | Complex visual, needs Vision LLM |

---

## Extraction Strategies

| Strategy | Description | When Used |
|----------|-------------|-----------|
| `auto` | Tries `pdf_text` first, falls back to status message | Default |
| `pdf_text` | Extract from PDF text layer | PDF with text |
| `ocr` | OCR via Tesseract/EasyOCR | Scanned PDFs, images |
| `vision_llm` | GPT-4V / Claude Vision | Complex infographics |

### Auto Strategy Logic

```
1. Check if file is PDF
2. Check if page has text layer
3. If yes → use pdf_text strategy
4. If no → return status "needs_ocr" or "needs_vision"
```

---

## Dataset Storage

```
backend/app/storage/datasets/
├── .gitkeep
├── ds-abcd-efgh.json
└── ...
```

**Dataset JSON structure**:
```json
{
  "id": "ds-abcd-efgh",
  "job_id": "job-1234-5678",
  "file_id": "a1b2c3d4-...",
  "page": 1,
  "bbox": [100, 200, 400, 500],
  "strategy_used": "pdf_text",
  "created_at": "2026-02-05T23:00:00Z",
  "updated_at": "2026-02-05T23:00:00Z",
  "columns": ["Name", "Value", "Unit"],
  "rows": [
    {"_row_id": 1, "Name": "Temperature", "Value": "25", "Unit": "°C"},
    {"_row_id": 2, "Name": "Pressure", "Value": "101.3", "Unit": "kPa"}
  ],
  "raw_text": "Original extracted text...",
  "confidence": 0.85
}
```

---

## Test Commands

```bash
# Get page info
curl http://127.0.0.1:8001/files/{file_id}/pages

# Preview page 1 at 2x scale
curl http://127.0.0.1:8001/files/{file_id}/pages/1/preview?scale=2 --output page1.png

# Start extraction job
curl -X POST http://127.0.0.1:8001/extract \
  -H "Content-Type: application/json" \
  -d '{"file_id": "{file_id}", "page": 1}'

# Check job status
curl http://127.0.0.1:8001/jobs/{job_id}
```

---

## Decisions

1. **Page numbering**: 1-indexed (user-friendly, matches PDF viewers).
2. **Preview scale default**: 1.5 (good balance of quality vs size).
3. **Synchronous extraction**: For MVP, extraction runs synchronously in the request. Job abstraction allows async later.
4. **Text extraction heuristic**: Use PyMuPDF's text blocks, attempt table detection via column alignment.
5. **Fallback behavior**: If no text layer, return `needs_ocr` status rather than failing.

---

## Implementation Checklist

- [x] `backend/app/schemas/extraction.py` - Request/response models
- [x] `backend/app/schemas/dataset.py` - Dataset model
- [x] `backend/app/services/pdf.py` - Page rendering + text extraction
- [x] `backend/app/services/extractor.py` - Strategy orchestrator
- [x] `backend/app/routers/extraction.py` - Endpoints
- [x] Update `backend/app/main.py` - Include router
- [x] Create datasets storage directory
