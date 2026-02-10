# Issue 001: DateTime Timezone Mismatch

## Status: RESOLVED ✅

## Problem Description

The `/datasets` endpoint returns HTTP 500 (Internal Server Error) due to a comparison between timezone-naive and timezone-aware datetime objects.

### Error Message
```
TypeError: can't compare offset-naive and offset-aware datetimes
```

### Stack Trace
```python
File "/backend/app/services/extractor.py", line 70, in list_datasets
    return sorted(datasets, key=lambda d: d.created_at, reverse=True)
TypeError: can't compare offset-naive and offset-aware datetimes
```

### Root Cause

The `list_datasets()` function attempts to sort datasets by `created_at` timestamp. However:

1. **Older datasets** (created with Phase 4 code) have timezone-naive datetimes stored as ISO strings without `Z` suffix
2. **Newer datasets** (created with Vision LLM Phase 5) use `datetime.now()` which produces timezone-naive datetimes
3. **Some code paths** use `datetime.now(timezone.utc)` which produces timezone-aware datetimes

When Pydantic parses these JSON files, it creates a mix of naive and aware datetime objects that cannot be compared.

### Affected Files
- `backend/app/services/extractor.py` (line 70)
- `backend/app/routers/identify.py` (uses `datetime.utcnow()` which is deprecated)
- `backend/app/services/vision.py` (uses `datetime.utcnow()`)
- Multiple dataset JSON files in `backend/app/storage/datasets/`

## Solution

### Fix 1: Normalize datetimes in list_datasets()

Modified `extractor.py` to normalize all datetimes to UTC before comparison:

```python
def normalize_datetime(dt):
    if dt is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

return sorted(datasets, key=lambda d: normalize_datetime(d.created_at), reverse=True)
```

### Fix 2: Replace deprecated datetime.utcnow()

Updated `identify.py` and `vision.py` to use `datetime.now(timezone.utc)` instead of `datetime.utcnow()`.

## Verification

```bash
curl -s http://127.0.0.1:8001/datasets | python3 -m json.tool | head -20
```

Expected: Returns JSON array of datasets instead of 500 error.

## Prevention

1. Always use `datetime.now(timezone.utc)` for new datetimes
2. Store timestamps with timezone info (`Z` suffix in JSON)
3. Add validation in Dataset model to normalize on load
