# Issue 007: ReviewPage Edits Not Persisted to Backend

## Status: ✅ RESOLVED

## Problem Description

When users edit cell values on the ReviewPage, the changes are stored only in React local state (`useState`). These edits are **never sent to the backend** via `PUT /datasets/{id}`, causing:

1. Edits are lost if user refreshes the page
2. Edits are lost if user navigates away and returns
3. Export downloads the original unedited data from backend

### Current Behavior

```typescript
// ReviewPage.tsx lines 286-318
const [datasets, setDatasets] = useState<Dataset[]>(extraction?.datasets || []);

const handleUpdateRow = (datasetIndex: number, rowIndex: number, column: string, value: string) => {
  setDatasets(prev => {
    // Only updates local state, never calls backend API
    const updated = [...prev];
    // ...
    return updated;
  });
};
```

### Expected Behavior

Edits should be persisted to the backend so they survive page refresh and are included in exports.

### Root Cause

The `PUT /datasets/{id}` endpoint exists and works, but `ReviewPage` never calls it. The frontend API client has no function to update datasets.

### Affected Files
- `frontend/src/pages/ReviewPage.tsx`
- `frontend/src/api/client.ts` (missing `updateDataset` function)

## Solution

### 1. Add API function in `client.ts`

```typescript
export const updateDataset = async (
  datasetId: string,
  update: { columns?: string[]; rows?: Record<string, unknown>[] }
): Promise<Dataset> => {
  const { data } = await api.put(`/datasets/${datasetId}`, update);
  return data;
};
```

### 2. Update `ReviewPage.tsx` to persist changes

Option A: Save on each edit (debounced)
```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash'; // or custom debounce

const debouncedSave = useMemo(
  () => debounce((datasetId: string, rows: Record<string, unknown>[]) => {
    updateDataset(datasetId, { rows });
  }, 1000),
  []
);

const handleUpdateRow = (datasetIndex: number, rowIndex: number, column: string, value: string) => {
  setDatasets(prev => {
    const updated = [...prev];
    // ... update logic
    debouncedSave(updated[datasetIndex].dataset_id, updated[datasetIndex].rows);
    return updated;
  });
};
```

Option B: Save button
```typescript
const handleSaveAll = async () => {
  for (const dataset of datasets) {
    await updateDataset(dataset.dataset_id, { rows: dataset.rows });
  }
  // Show success toast
};
```

## Verification

1. Edit a cell value on ReviewPage
2. Refresh the page
3. Verify the edit persists
4. Export and verify the edited value is in the CSV/JSON

## Prevention

- Add integration test: edit → refresh → verify persistence
- Consider optimistic updates with error rollback

## Impact

**HIGH** — Users lose their corrections, defeating the purpose of "human-in-the-loop" review.
