# Phase 2: Upload + Storage

> Created: 2026-02-05

## Goal

Accept file uploads (PDF/PNG/JPG), persist to filesystem, return metadata including page count for PDFs.

---

## API Contracts

### POST /files

Upload a file for processing.

**Request**: `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF, PNG, or JPG file |

**Response**: `201 Created`
```json
{
  "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "filename": "chart.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 102400,
  "pages": 3,
  "created_at": "2026-02-05T22:30:00Z"
}
```

**Errors**:
| Status | Reason |
|--------|--------|
| `400` | Unsupported file type |
| `413` | File too large (>50MB) |

---

### GET /files/{id}

Get metadata for an uploaded file.

**Response**: `200 OK`
```json
{
  "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "filename": "chart.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 102400,
  "pages": 3,
  "created_at": "2026-02-05T22:30:00Z"
}
```

**Errors**:
| Status | Reason |
|--------|--------|
| `404` | File not found |

---

## Storage Layout

```
backend/app/storage/
├── .gitkeep
├── a1b2c3d4-5678-90ab-cdef-1234567890ab/
│   ├── metadata.json      # FileMetadata as JSON
│   └── original.pdf       # Original uploaded file
└── ...
```

Each upload gets a UUID directory containing:
- `metadata.json`: Serialized metadata for quick retrieval
- `original.<ext>`: The uploaded file with original extension

---

## Supported MIME Types

| Extension | MIME Type |
|-----------|-----------|
| `.pdf` | `application/pdf` |
| `.png` | `image/png` |
| `.jpg` / `.jpeg` | `image/jpeg` |

---

## File Size Limit

- **Max size**: 50 MB (configurable via `MAX_UPLOAD_SIZE_MB` env var)

---

## Test Commands

```bash
# Upload a PDF
curl -X POST http://127.0.0.1:8001/files \
  -F "file=@demo_assets/sample.pdf"

# Upload an image
curl -X POST http://127.0.0.1:8001/files \
  -F "file=@demo_assets/chart.png"

# Get file metadata
curl http://127.0.0.1:8001/files/{id}
```

---

## Implementation Checklist

- [x] `backend/app/schemas/upload.py` - Pydantic models
- [x] `backend/app/services/storage.py` - File I/O abstraction
- [x] `backend/app/routers/upload.py` - Endpoints
- [x] Update `backend/app/main.py` - Include router
- [x] Add `pymupdf` to dependencies - PDF page counting
