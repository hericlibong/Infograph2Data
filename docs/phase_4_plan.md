# Phase 4: Review + Export

> Created: 2026-02-06

## Goal

Enable users to review and edit extracted datasets, then export as a ZIP package with CSV, JSON, and provenance manifest.

---

## API Contracts

### GET /datasets/{dataset_id}

Get an extracted dataset for review.

**Response**: `200 OK`
```json
{
  "id": "ds-92a198fa93d7",
  "job_id": "job-ceb14ad98a53",
  "file_id": "3cb22d4c-027d-4d56-ac81-c2b23e33bbda",
  "page": 1,
  "bbox": null,
  "strategy_used": "pdf_text",
  "created_at": "2026-02-06T00:05:15.419949Z",
  "updated_at": "2026-02-06T00:05:15.419949Z",
  "columns": ["Product", "Price", "Quantity"],
  "rows": [
    {"row_id": 1, "Product": "Apple", "Price": "1.50", "Quantity": "100"},
    {"row_id": 2, "Product": "Banana", "Price": "0.75", "Quantity": "200"},
    {"row_id": 3, "Product": "Orange", "Price": "2.00", "Quantity": "150"}
  ],
  "raw_text": "Product\tPrice\tQuantity\n...",
  "confidence": 0.8,
  "edit_history": []
}
```

**Errors**:
| Status | Reason |
|--------|--------|
| `404` | Dataset not found |

---

### PUT /datasets/{dataset_id}

Update a dataset (edit rows, columns, or add/remove rows).

**Request**: `application/json`
```json
{
  "columns": ["Product", "Price", "Quantity", "In Stock"],
  "rows": [
    {"row_id": 1, "Product": "Apple", "Price": "1.75", "Quantity": "100", "In Stock": "Yes"},
    {"row_id": 2, "Product": "Banana", "Price": "0.75", "Quantity": "200", "In Stock": "Yes"},
    {"row_id": 3, "Product": "Orange", "Price": "2.00", "Quantity": "150", "In Stock": "No"}
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columns` | array | No | Updated column names |
| `rows` | array | No | Updated rows (full replacement) |

**Response**: `200 OK`
```json
{
  "id": "ds-92a198fa93d7",
  "updated_at": "2026-02-06T01:00:00.000000Z",
  "columns": ["Product", "Price", "Quantity", "In Stock"],
  "rows": [...],
  "edit_history": [
    {
      "timestamp": "2026-02-06T01:00:00.000000Z",
      "action": "update",
      "changes": {
        "columns_added": ["In Stock"],
        "rows_modified": 3
      }
    }
  ]
}
```

**Errors**:
| Status | Reason |
|--------|--------|
| `404` | Dataset not found |
| `400` | Invalid update payload |

---

### GET /export/{dataset_id}

Export a dataset as a ZIP package.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `formats` | string | `csv,json` | Comma-separated: `csv`, `json` |

**Response**: `200 OK`
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="ds-92a198fa93d7.zip"`
- Body: ZIP file bytes

**ZIP Contents**:
```
ds-92a198fa93d7.zip
├── data.csv           # CSV export
├── data.json          # JSON export (array of objects)
└── manifest.json      # Provenance metadata
```

**manifest.json structure**:
```json
{
  "dataset_id": "ds-92a198fa93d7",
  "exported_at": "2026-02-06T01:30:00.000000Z",
  "source": {
    "file_id": "3cb22d4c-027d-4d56-ac81-c2b23e33bbda",
    "filename": "table_sample.pdf",
    "page": 1,
    "bbox": null
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
    "last_edited_at": "2026-02-06T01:00:00.000000Z",
    "history": [...]
  }
}
```

**Errors**:
| Status | Reason |
|--------|--------|
| `404` | Dataset not found |

---

## Edit History Tracking

Each edit creates a history entry:

```json
{
  "timestamp": "2026-02-06T01:00:00.000000Z",
  "action": "update",
  "changes": {
    "columns_added": ["In Stock"],
    "columns_removed": [],
    "rows_added": 0,
    "rows_removed": 0,
    "rows_modified": 3
  }
}
```

---

## Test Commands

```bash
# Get dataset
curl http://127.0.0.1:8001/datasets/{dataset_id}

# Update dataset (edit a cell)
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
```

---

## Decisions

1. **Full row replacement**: PUT replaces all rows (simpler than PATCH for individual cells).
2. **Edit history**: Append-only log of changes for provenance.
3. **ZIP export**: Single download with all formats + manifest.
4. **CSV quoting**: Use standard CSV with proper escaping.

---

## Implementation Checklist

- [x] `backend/app/schemas/export.py` - Export manifest schema
- [x] `backend/app/schemas/dataset.py` - Add EditHistoryEntry
- [x] `backend/app/routers/review.py` - GET/PUT /datasets/{id}
- [x] `backend/app/routers/export.py` - GET /export/{id}
- [x] Update `backend/app/main.py` - Include routers
