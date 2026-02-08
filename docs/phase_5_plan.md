# Phase 5 — Vision LLM Extraction

> Two-step extraction workflow: Identify → Confirm → Extract

---

## Overview

This phase implements the core value proposition of Infograph2Data: extracting structured data from infographics, charts, and visual data using Vision LLM (GPT-4o).

### Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      STEP 1: IDENTIFICATION                    │
├─────────────────────────────────────────────────────────────────┤
│ Input  : Image (PNG/JPG) or PDF page                           │
│ Action : Vision LLM analyzes and identifies visual elements    │
│ Output : List of detected items with:                          │
│          - type (bar_chart, pie_chart, kpi_panel, etc.)        │
│          - title                                                │
│          - description                                          │
│          - data_preview                                         │
│          - bbox (bounding box coordinates)                      │
│          - confidence score                                     │
│          - warnings (if any)                                    │
│ UX     : User confirms / modifies / selects items to extract   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [User Confirmation]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      STEP 2: EXTRACTION                         │
├─────────────────────────────────────────────────────────────────┤
│ Input  : Image + confirmed items (with optional overrides)     │
│ Action : Vision LLM extracts structured data                   │
│ Output : Dataset(s) with columns + rows                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Contract

### Step 1: Identification

```
POST /extract/identify
```

**Request:**
```json
{
  "file_id": "abc-123",
  "page": 1
}
```

**Response:**
```json
{
  "identification_id": "ident-xyz",
  "file_id": "abc-123",
  "page": 1,
  "image_dimensions": {"width": 1052, "height": 751},
  "detected_items": [
    {
      "item_id": "item-1",
      "type": "pie_chart",
      "title": "Sector Distribution",
      "description": "Pie chart showing 7 sectors with percentages",
      "data_preview": "7 categories, percentages summing to ~100%",
      "bbox": {"x": 620, "y": 380, "width": 400, "height": 350},
      "confidence": 0.95,
      "warnings": []
    },
    {
      "item_id": "item-2",
      "type": "time_series",
      "title": "Association Count Evolution",
      "description": "Line chart from 2012 to 2022, 11 data points",
      "data_preview": "11 points, Y range 0-300, only 2 values annotated",
      "bbox": {"x": 50, "y": 380, "width": 550, "height": 200},
      "confidence": 0.85,
      "warnings": ["Most values not annotated, extraction will be approximate"]
    },
    {
      "item_id": "item-3",
      "type": "kpi_panel",
      "title": "Key Metrics",
      "description": "Key metrics: 780 associations, 24 creations/year, employment stats",
      "data_preview": "~8 numeric KPIs with labels",
      "bbox": {"x": 50, "y": 80, "width": 600, "height": 280},
      "confidence": 0.92,
      "warnings": []
    }
  ],
  "status": "awaiting_confirmation",
  "expires_at": "2026-02-08T01:09:25Z"
}
```

### Step 2: Extraction

```
POST /extract/run
```

**Request:**
```json
{
  "identification_id": "ident-xyz",
  "items": [
    {
      "item_id": "item-1",
      "title": "Sector distribution",
      "type": "pie_chart"
    },
    {
      "item_id": "item-3"
    },
    {
      "item_id": "new-1",
      "type": "table",
      "title": "Additional table spotted by user",
      "bbox": {"x": 100, "y": 500, "width": 200, "height": 100}
    }
  ],
  "options": {
    "merge_datasets": false,
    "output_language": "en"
  }
}
```

**Item Selection Logic:**

| Case | Behavior |
|------|----------|
| `item_id` only | Uses original detection |
| `item_id` + `title`/`type` | Overrides detected values |
| `item_id: "new-X"` + `bbox` | User-added element |
| Item absent from list | Not extracted (deselected) |

**Response:**
```json
{
  "job_id": "job-extraction",
  "identification_id": "ident-xyz",
  "datasets": [
    {
      "dataset_id": "ds-001",
      "source_item_id": "item-1",
      "title": "Sector distribution",
      "type": "pie_chart",
      "columns": ["Sector", "Percentage"],
      "rows": [
        {"row_id": "r1", "Sector": "Social action", "Percentage": 23.3},
        {"row_id": "r2", "Sector": "Education", "Percentage": 21.1},
        {"row_id": "r3", "Sector": "Health", "Percentage": 17.3}
      ],
      "metadata": {
        "source_bbox": {"x": 620, "y": 380, "width": 400, "height": 350},
        "extraction_confidence": 0.95,
        "notes": null
      }
    }
  ],
  "status": "completed"
}
```

**Merge Option (merge_datasets=true):**
```json
{
  "datasets": [
    {
      "dataset_id": "ds-merged",
      "title": "Merged extraction",
      "source_items": ["item-1", "item-3"],
      "columns": ["Source", "Category", "Label", "Value", "Unit"],
      "rows": [
        {"row_id": "r1", "Source": "item-1", "Category": "Sector", "Label": "Social action", "Value": 23.3, "Unit": "%"},
        {"row_id": "r2", "Source": "item-3", "Category": "KPI", "Label": "Associations count", "Value": 780, "Unit": "count"}
      ]
    }
  ]
}
```

---

## Element Type Taxonomy

| Type | Code | Output Structure |
|------|------|------------------|
| Simple bar chart | `bar_chart` | `Category, Value` |
| Grouped bar chart | `grouped_bar_chart` | `Category, Series, Value` |
| Stacked bar chart | `stacked_bar_chart` | `Category, Segment, Value` |
| Line chart | `line_chart` | `X, Y` |
| Multi-line chart | `multi_line_chart` | `X, Series, Y` |
| Pie/Donut chart | `pie_chart` | `Category, Percentage` |
| Data table | `table` | Detected columns |
| KPI panel | `kpi_panel` | `Indicator, Value, Unit, Context` |
| Map with data | `map_data` | `Region, Value` |
| Other | `other` | Best-effort |

---

## Warnings and Limitations

| Situation | Warning Message |
|-----------|-----------------|
| Values not annotated (axis reading) | `"Values read from axis, accuracy ±10%"` |
| Low resolution/blurry text | `"Low resolution, some values may be incorrect"` |
| Overlapping elements | `"Overlapping elements detected, may affect accuracy"` |
| Language not recognized | `"Language detection uncertain"` |
| Partially visible element | `"Element appears cropped"` |

---

## Vision LLM Prompts

### Prompt: Identification (Step 1)

```
You are a data extraction assistant. Analyze this image and identify all data visualizations and infographics present.

For each distinct element, provide:
1. type: one of [bar_chart, grouped_bar_chart, stacked_bar_chart, line_chart, multi_line_chart, pie_chart, table, kpi_panel, map_data, other]
2. title: the title or heading of this element (if visible)
3. description: brief description of what data it contains
4. data_preview: estimated structure (e.g., "5 categories, 3 series", "12 monthly values")
5. bbox: bounding box as {x, y, width, height} in pixels from top-left
6. confidence: 0.0-1.0 how confident you are in this detection
7. warnings: array of any concerns about extraction accuracy

Respond in JSON format:
{
  "detected_items": [...]
}

Important:
- Identify SEPARATE elements, not one merged infographic
- Include standalone KPIs/metrics as kpi_panel type
- Note if values are annotated on the chart vs. need to be read from axes
```

### Prompt: Extraction (Step 2)

```
You are a data extraction assistant. Extract structured data from the specified elements in this image.

Elements to extract:
{{items_json}}

For each element, extract ALL numeric data into a structured table format.

Rules:
- Use the exact values shown (do not round)
- If values must be read from an axis (not annotated), add a note about accuracy
- Translate labels to {{output_language}} if requested
- Preserve the original meaning and context

Respond in JSON format:
{
  "extractions": [
    {
      "item_id": "...",
      "columns": ["Col1", "Col2", ...],
      "rows": [{"Col1": value, "Col2": value}, ...],
      "notes": "any extraction notes"
    }
  ]
}
```

---

## Endpoint Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /extract/identify` | Step 1 | Detect elements, return preview |
| `GET /extract/identify/{id}` | Query | Retrieve existing identification |
| `POST /extract/run` | Step 2 | Extract data from confirmed items |
| `GET /jobs/{id}` | Query | Job status (existing) |
| `GET /datasets/{id}` | Query | Get dataset (existing) |
| `PUT /datasets/{id}` | Edit | Modify dataset (existing) |
| `GET /export/{id}` | Export | Export to ZIP (existing) |

---

## Implementation Tasks

| # | Task | Files |
|---|------|-------|
| 1 | Add `openai` dependency | `pyproject.toml` |
| 2 | Add `OPENAI_API_KEY` to env | `.env.example`, `config.py` |
| 3 | Create identification schemas | `schemas/identification.py` |
| 4 | Create Vision LLM service | `services/vision.py` |
| 5 | Create identification router | `routers/identify.py` |
| 6 | Update extraction router for Step 2 | `routers/extraction.py` |
| 7 | Add identification storage | `services/extractor.py` |
| 8 | Unit tests for vision service | `tests/unit/test_vision.py` |
| 9 | Integration tests | `tests/integration/test_identify.py` |
| 10 | Test on demo assets | Manual verification |

---

## Test Files

| File | Expected Detection |
|------|-------------------|
| `case1a_infographies.png` | 4 items: kpi_panel, time_series, pie_chart, kpi_panel |
| `case2a_time_series_chart.png` | 1 item: multi_line_chart |
| `case3a_linechart_capture.png` | 1 item: line_chart |
| `case4a_stacked_bar_chart.png` | 1 item: stacked_bar_chart |
| `case5a_grouped_bar_chart.png` | 1 item: grouped_bar_chart |
| `case2b_infographies_multipages.pdf` | Page 1: same as case1a, Page 2: ~4 items |

---

## Configuration

```python
# .env.example
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o
VISION_TIMEOUT=30
IDENTIFICATION_TTL=3600  # seconds before identification expires
```

---

## Error Handling

| Error | HTTP Code | Response |
|-------|-----------|----------|
| Missing API key | 503 | `{"detail": "Vision LLM not configured"}` |
| API timeout | 504 | `{"detail": "Vision LLM timeout"}` |
| Invalid file type | 400 | `{"detail": "File type not supported for vision extraction"}` |
| Identification expired | 410 | `{"detail": "Identification expired, please re-identify"}` |
| API rate limit | 429 | `{"detail": "Rate limit exceeded, retry later"}` |
