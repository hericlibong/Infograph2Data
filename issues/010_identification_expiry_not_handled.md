# Issue 010: Identification Expiry Not Handled in Frontend

## Status: ✅ RESOLVED

## Problem Description

The backend sets a TTL (Time-To-Live) of 1 hour on identification records. After expiry, extraction requests return HTTP 410 (Gone). The frontend does not handle this gracefully.

### Backend Configuration

```python
# backend/app/config.py
identification_ttl: int = 3600  # 1 hour in seconds
```

### Backend Expiry Check

```python
# backend/app/routers/identify.py lines 150-154
if datetime.now(timezone.utc) > stored.expires_at:
    raise HTTPException(
        status_code=410,
        detail="Identification expired. Please re-identify.",
    )
```

### Frontend Behavior

The frontend stores `identification.expires_at` in Zustand state but never checks it. If a user:

1. Runs identification
2. Leaves the tab open for 1+ hours
3. Tries to extract

They get an unhelpful error: "Extraction failed: Request failed with status code 410"

### Affected Files
- `frontend/src/pages/IdentifyPage.tsx`
- `frontend/src/store/useAppStore.ts`

## Solution

### 1. Check expiry before extraction

```typescript
// IdentifyPage.tsx - before handleExtract
const handleExtract = async (itemIds: string[]) => {
  if (!identification) return;
  
  // Check if identification has expired
  const expiresAt = new Date(identification.expires_at);
  if (new Date() > expiresAt) {
    setExtractError('Identification expired. Please re-analyze the image.');
    setIdentification(null);  // Clear stale identification
    return;
  }
  
  // ... proceed with extraction
};
```

### 2. Display remaining time (optional UX improvement)

```typescript
// Show countdown or warning when close to expiry
const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

useEffect(() => {
  if (!identification) return;
  
  const interval = setInterval(() => {
    const expiresAt = new Date(identification.expires_at);
    const remaining = expiresAt.getTime() - Date.now();
    
    if (remaining <= 0) {
      setTimeRemaining('Expired');
      clearInterval(interval);
    } else if (remaining < 5 * 60 * 1000) {  // Less than 5 minutes
      const minutes = Math.floor(remaining / 60000);
      setTimeRemaining(`Expires in ${minutes}m`);
    } else {
      setTimeRemaining(null);
    }
  }, 30000);  // Check every 30 seconds
  
  return () => clearInterval(interval);
}, [identification]);

// In JSX:
{timeRemaining && (
  <div className="text-amber-600 text-sm">
    ⚠️ {timeRemaining === 'Expired' 
      ? 'Identification expired. Please re-analyze.' 
      : timeRemaining}
  </div>
)}
```

### 3. Handle 410 error gracefully

```typescript
// In extraction error handling
} catch (err) {
  if (err.response?.status === 410) {
    setExtractError('Identification expired. Please click "Re-analyze" to continue.');
    // Optionally auto-trigger re-identification
  } else {
    setExtractError(err instanceof Error ? err.message : 'Extraction failed');
  }
}
```

## Verification

1. Run identification
2. Manually set system clock forward 2 hours (or reduce TTL in backend for testing)
3. Try to extract
4. Verify user-friendly error message appears
5. Verify "Re-analyze" button is clearly available

## Additional Considerations

- Consider increasing `identification_ttl` to 2-4 hours for better UX
- Could implement automatic refresh of identification if nearing expiry
- Store identification in localStorage for session recovery

## Impact

**MEDIUM** — Users who leave the app idle for extended periods will hit this. Clear error messaging reduces confusion.
