# Issue 009: No Confirmation Before Reset

## Status: ❌ OPEN

## Problem Description

The "Start New Extraction" button on ExportPage immediately calls `reset()` without any confirmation dialog. This can cause users to accidentally lose their work.

### Current Code

```typescript
// ExportPage.tsx line 186-188
const handleStartNew = () => {
  reset();  // Immediately clears all state - no confirmation!
};
```

### What Gets Lost

When `reset()` is called, the following Zustand state is cleared:
- `currentFile` — uploaded file reference
- `identification` — detected elements
- `extraction` — extracted datasets
- `currentPage` — PDF page number
- `selectedElements` — user selections

### User Scenario

1. User uploads a complex PDF
2. Spends 5 minutes extracting and editing data
3. Accidentally clicks "Start New Extraction" instead of "Download"
4. All work is immediately lost with no way to recover

### Affected Files
- `frontend/src/pages/ExportPage.tsx`

## Solution

### Option A: Browser Confirm Dialog (Simple)

```typescript
const handleStartNew = () => {
  const confirmed = window.confirm(
    'Are you sure you want to start a new extraction? All current work will be lost.'
  );
  if (confirmed) {
    reset();
  }
};
```

### Option B: Custom Modal Dialog (Better UX)

```typescript
const [showResetConfirm, setShowResetConfirm] = useState(false);

const handleStartNew = () => {
  setShowResetConfirm(true);
};

// In JSX:
{showResetConfirm && (
  <ConfirmDialog
    title="Start New Extraction?"
    message="All current work will be lost. This cannot be undone."
    confirmLabel="Yes, Start New"
    cancelLabel="Cancel"
    onConfirm={() => { reset(); setShowResetConfirm(false); }}
    onCancel={() => setShowResetConfirm(false)}
  />
)}
```

### Option C: Add beforeunload handler (Additional protection)

```typescript
// In App.tsx or relevant component
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (extraction) {  // Only if there's work in progress
      e.preventDefault();
      e.returnValue = '';  // Required for Chrome
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [extraction]);
```

## Verification

1. Complete an extraction workflow to ExportPage
2. Click "Start New Extraction"
3. Verify a confirmation dialog appears
4. Click "Cancel" — verify you stay on ExportPage with data intact
5. Click "Confirm" — verify reset happens

## Additional Improvements

- Also add confirmation when changing PDF page (resets identification)
- Consider localStorage backup of state for recovery

## Impact

**MEDIUM** — Causes frustration and lost work, but users can redo the extraction.
