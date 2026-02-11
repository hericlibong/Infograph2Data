# Issue 008: Export Ignores Frontend Edits

## Status: ✅ RESOLVED

## Problem Description

The Export functionality downloads the dataset directly from the backend, completely ignoring any edits the user made on the ReviewPage.

### Current Flow

```
ReviewPage: User edits cells → Local state updated → NOT sent to backend
     ↓
ExportPage: Calls GET /export/{dataset_id}
     ↓
Backend: Loads dataset from disk (original data, no edits)
     ↓
User downloads ZIP with WRONG (unedited) data
```

### Code Location

```typescript
// ExportPage.tsx line 165
const blob = await exportDataset(datasetId, selectedFormats, sourceFilter);
// This calls backend which loads from disk, ignoring local edits
```

### Root Cause

This is a direct consequence of Issue 007 (edits not persisted). The export endpoint correctly reads from storage, but the frontend never writes edits to storage.

### Affected Files
- `frontend/src/pages/ExportPage.tsx`
- `frontend/src/pages/ReviewPage.tsx`
- `frontend/src/api/client.ts`

## Solution

### Primary Fix: Resolve Issue 007

Once edits are persisted to backend (Issue 007), this issue is automatically resolved.

### Alternative: Client-side export

If backend persistence is not desired, generate the export entirely in the browser:

```typescript
// ExportPage.tsx
const handleClientSideExport = () => {
  // Use local `datasets` state from Zustand or passed from ReviewPage
  const csvContent = generateCSV(datasets);
  const jsonContent = JSON.stringify(datasets, null, 2);
  
  // Create and download ZIP using JSZip
  const zip = new JSZip();
  zip.file('data.csv', csvContent);
  zip.file('data.json', jsonContent);
  zip.file('manifest.json', generateManifest());
  
  const blob = await zip.generateAsync({ type: 'blob' });
  // Trigger download
};
```

**Note**: This approach requires adding `jszip` dependency and duplicating export logic.

## Verification

1. Upload a file and extract data
2. On ReviewPage, edit several cell values
3. Go to ExportPage and download
4. Open the downloaded CSV/JSON
5. Verify that edited values are present, not original values

## Impact

**CRITICAL** — This defeats the entire purpose of the application. Users spend time correcting data, then export the wrong data.

## Dependencies

- Depends on Issue 007 being resolved first (if using backend persistence approach)
