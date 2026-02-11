# Issue 005: Export Ignores Source Filter Selection

## Status: ✅ RESOLVED

## Problem Description

When users filter data on the Review page (selecting "Annotated Only" or "Estimated Only"), the export still includes **all data** regardless of the filter selection.

### Expected Behavior

- User selects "Annotated Only" → Export contains only annotated rows
- User selects "Estimated Only" → Export contains only estimated rows
- User selects "All Data" → Export contains all rows

### Actual Behavior (Before Fix)

- Export always includes all rows, ignoring the filter selection

## Root Cause

The source filter state (`sourceFilter`) was local to the `ReviewPage` component and was not:
1. Passed to the `ExportPage`
2. Used when calling the export API

The export endpoint (`GET /export/{dataset_id}`) fetched the full dataset from disk without any filtering.

## Solution Implemented

### 1. Added `sourceFilter` to Zustand Store

```typescript
// useAppStore.ts
export type SourceFilter = 'all' | 'annotated' | 'estimated';

interface AppState {
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
}
```

### 2. Updated ReviewPage to Use Global Store

Replaced local `useState` with Zustand store:
```typescript
const { sourceFilter, setSourceFilter } = useAppStore();
```

### 3. Added `source_filter` Parameter to Backend

```python
# backend/app/routers/export.py
async def export_dataset(
    dataset_id: str,
    formats: str = Query("csv,json"),
    source_filter: str = Query("all", description="Filter by source: all, annotated, estimated"),
) -> Response:
    # Apply source filter
    if source_filter in ("annotated", "estimated"):
        filtered_rows = [r for r in dataset.rows if r.get("source") == source_filter]
        filtered_columns = [c for c in dataset.columns if c != "source"]
    else:
        filtered_rows = dataset.rows
        filtered_columns = dataset.columns
```

### 4. Updated Frontend API Client

```typescript
export const exportDataset = async (
  datasetId: string,
  formats: string[] = ['csv', 'json'],
  sourceFilter: 'all' | 'annotated' | 'estimated' = 'all'
): Promise<Blob>
```

### 5. Updated ExportPage

- Reads `sourceFilter` from store
- Passes filter to `exportDataset()` API call
- Displays filter status with row count when filter is active

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/store/useAppStore.ts` | Added `SourceFilter` type, `sourceFilter` state, `setSourceFilter` action |
| `frontend/src/pages/ReviewPage.tsx` | Import `SourceFilter` from store, use global state |
| `frontend/src/pages/ExportPage.tsx` | Read filter, pass to API, display filter indicator |
| `frontend/src/api/client.ts` | Added `sourceFilter` param to `exportDataset()` |
| `backend/app/routers/export.py` | Added `source_filter` query param, filter rows before export |

## Verification

1. Extract data with `full_with_source` granularity
2. On Review page, select "Annotated Only"
3. Go to Export page → See "Exporting annotated data only" message
4. Download ZIP → Verify only annotated rows in CSV/JSON
5. Repeat with "Estimated Only" and "All Data"

## Tests

All 8 export tests pass:
```
tests/integration/test_export.py ... 8 passed
```

---

*Created: 2026-02-10*
*Resolved: 2026-02-10*
