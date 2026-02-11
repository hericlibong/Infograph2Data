# Infograph2Data — Known Issues

This folder documents known issues, their root causes, and solutions.

## Issue Status Legend

| Status | Meaning |
|--------|---------|
| ✅ RESOLVED | Issue fixed and verified |
| ⚠️ PARTIALLY RESOLVED | Mitigations in place, some edge cases remain |
| ❌ OPEN | Issue identified, fix pending |

---

## Issues Summary

| # | Title | Status | Impact |
|---|-------|--------|--------|
| 001 | DateTime Timezone Mismatch | ✅ RESOLVED | Backend crashes on /datasets |
| 002 | Vision LLM JSON Parsing | ✅ RESOLVED | Extraction fails with JSONDecodeError |
| 003 | Network Error During Extraction | ✅ RESOLVED | Frontend shows "Network Error" |
| 004 | Incomplete Data Extraction | ⚠️ PARTIAL | Complex charts may have missing data |
| 005 | Export Ignores Source Filter | ✅ RESOLVED | Export includes all data regardless of filter |
| 006 | HealthResponse Type Mismatch | ❌ OPEN | TypeScript type doesn't match API |
| 007 | ReviewPage Edits Not Persisted | ✅ RESOLVED | User edits lost on refresh |
| 008 | Export Ignores Frontend Edits | ✅ RESOLVED | Export downloads unedited data |
| 009 | No Confirmation Before Reset | ❌ OPEN | Users can lose work accidentally |
| 010 | Identification Expiry Not Handled | ❌ OPEN | Cryptic error after 1h idle |

---

## Quick Reference

### Issue 001: DateTime Timezone Mismatch
- **Symptom**: `/datasets` returns 500 error
- **Fix**: Normalize datetimes in `list_datasets()`, use `datetime.now(timezone.utc)`

### Issue 002: Vision LLM JSON Parsing
- **Symptom**: `JSONDecodeError` during extraction
- **Fix**: Added `_parse_json_response()` with trailing comma removal and fallback parsing

### Issue 003: Network Error During Extraction
- **Symptom**: "Network Error" in frontend console
- **Fix**: Added OpenAI API error handling (timeout, connection, API errors) with descriptive messages

### Issue 004: Incomplete Data Extraction
- **Symptom**: Charts missing data points
- **Mitigation**: Granularity options, improved prompts, human-in-the-loop review
- **Status**: Inherent Vision LLM limitation, mitigations help but don't fully solve

### Issue 005: Export Ignores Source Filter
- **Symptom**: Export includes all data even when "Annotated Only" selected
- **Fix**: Store filter in Zustand, add `source_filter` param to backend, filter rows before export

### Issue 006: HealthResponse Type Mismatch
- **Symptom**: Frontend TypeScript type expects `timestamp`, backend returns `version`
- **Fix**: Update `HealthResponse` interface in `types/index.ts`

### Issue 007: ReviewPage Edits Not Persisted
- **Symptom**: Edits made on ReviewPage are lost on page refresh
- **Fix**: Added `updateDataset` API call with debounced save (1s delay) after each edit

### Issue 008: Export Ignores Frontend Edits
- **Symptom**: Downloaded export contains original data, not user corrections
- **Fix**: Resolved by Issue 007 — edits now persisted to backend, export reads correct data

### Issue 009: No Confirmation Before Reset
- **Symptom**: Clicking "Start New Extraction" immediately clears all work
- **Fix**: Add confirmation dialog before calling `reset()`

### Issue 010: Identification Expiry Not Handled
- **Symptom**: After 1h idle, extraction fails with cryptic 410 error
- **Fix**: Check `expires_at` before extraction, show user-friendly message

---

## How to Report New Issues

Create a new markdown file following this template:

```markdown
# Issue XXX: Title

## Status: ❌ OPEN / ⚠️ PARTIAL / ✅ RESOLVED

## Problem Description
What is happening?

### Error Message
```
Exact error message
```

### Root Cause
Why is this happening?

### Affected Files
- file1.py
- file2.ts

## Solution
How was it fixed? (or proposed fix)

## Verification
How to verify the fix works?

## Prevention
How to prevent this in the future?
```

---

## Last Updated
2026-02-11
