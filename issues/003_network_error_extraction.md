# Issue 003: Network Error During Vision LLM Extraction

## Status: RESOLVED ✅

## Problem Description

The frontend displays "Network Error" and "Failed to extract any data" after multiple retry attempts. The error occurs during the `/extract/run` API call.

### Error Messages (from browser console)
```
API Error [POST /extract/run]: Network Error undefined
Giving up on item item-1 after 3 attempts
Extraction failed: Error: Failed to extract any data. Please try again.
```

### Screenshots
- `drafts/error2.png` - Shows "Extracting data..." followed by Network Error
- `drafts/error3.png` - Shows "Extraction failed: Failed to extract any data"

### Root Causes

Multiple factors contribute to this issue:

1. **Timeout Mismatch**: The OpenAI API call uses `timeout=settings.vision_timeout` (120s), but large images with complex charts can take 60-120 seconds to process

2. **No Graceful Error Handling**: When the API times out or fails, the error message is not descriptive

3. **Retry Logic Issues**: The frontend retries 3 times, but if the server is overloaded, retries make it worse

4. **Missing Request Timeout in API Client**: The OpenAI client may have internal timeouts shorter than our configured value

### Affected Files
- `backend/app/services/vision.py` (OpenAI API calls)
- `frontend/src/api/client.ts` (retry logic)
- `backend/app/routers/identify.py` (error handling)

## Solution

### Fix 1: Improved error handling in vision.py

Added explicit timeout handling and better error messages:

```python
from openai import OpenAI, APITimeoutError, APIError

try:
    response = client.chat.completions.create(...)
except APITimeoutError as e:
    logger.error(f"OpenAI API timeout after {settings.vision_timeout}s")
    raise RuntimeError(f"Vision LLM timeout ({settings.vision_timeout}s). Try a simpler image.")
except APIError as e:
    logger.error(f"OpenAI API error: {e}")
    raise RuntimeError(f"Vision LLM error: {e.message}")
```

### Fix 2: Better error responses in identify.py

Return user-friendly error messages:

```python
except RuntimeError as e:
    raise HTTPException(status_code=504, detail=str(e))
except Exception as e:
    logger.exception("Unexpected error")
    raise HTTPException(status_code=500, detail="Unexpected error during extraction")
```

### Fix 3: Improved frontend error display

Show specific error messages from the backend instead of generic "Network Error":

```typescript
} catch (err) {
  if (axios.isAxiosError(err) && err.response?.data?.detail) {
    setExtractError(err.response.data.detail);
  } else {
    setExtractError(err instanceof Error ? err.message : 'Extraction failed');
  }
}
```

## Verification

1. Upload a complex infographic
2. Run identification and extraction
3. Verify extraction completes or shows meaningful error

## Prevention

1. Consider implementing streaming/progress feedback for long operations
2. Add frontend loading states with estimated time
3. Implement server-sent events (SSE) for real-time progress updates
4. Consider breaking down complex images into smaller regions
