# Issue 002: Vision LLM JSON Parsing Errors

## Status: RESOLVED ✅

## Problem Description

The Vision LLM extraction fails with `JSONDecodeError` when parsing the response from GPT-4o. The model sometimes returns malformed JSON or includes trailing content.

### Error Message
```
JSONDecodeError: Expecting property name enclosed in double quotes: line 11 column 65 (char 404)
```

### Stack Trace
```python
File "/backend/app/services/vision.py", line 417, in extract_data
    data = json.loads(content.strip())
json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes
```

### Root Cause

1. GPT-4o occasionally includes trailing commas in JSON arrays (invalid JSON)
2. Sometimes the model adds explanatory text after the JSON block
3. The current regex for extracting JSON from markdown code blocks is fragile
4. No error recovery mechanism when JSON parsing fails

### Affected Files
- `backend/app/services/vision.py` (lines 267-273, 411-417)

### Example Malformed Responses

```json
{
  "extractions": [
    {"item_id": "item-1", "rows": [...],}  // <-- trailing comma
  ]
}
```

```
```json
{"extractions": [...]}
```
Some additional notes about the extraction...
```

## Solution

### Fix: Robust JSON parsing with error recovery

1. Better regex for extracting JSON from markdown
2. Remove trailing commas before parsing
3. Fallback to finding JSON object boundaries manually
4. Add detailed logging for debugging

```python
def _parse_json_response(content: str) -> dict:
    """Parse JSON from LLM response with error recovery."""
    # Try to extract JSON from markdown code block
    if "```json" in content:
        match = re.search(r'```json\s*([\s\S]*?)\s*```', content)
        if match:
            content = match.group(1)
    elif "```" in content:
        match = re.search(r'```\s*([\s\S]*?)\s*```', content)
        if match:
            content = match.group(1)
    
    content = content.strip()
    
    # Remove trailing commas (common LLM error)
    content = re.sub(r',\s*}', '}', content)
    content = re.sub(r',\s*]', ']', content)
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Fallback: find JSON object boundaries
        start = content.find('{')
        end = content.rfind('}') + 1
        if start >= 0 and end > start:
            try:
                return json.loads(content[start:end])
            except json.JSONDecodeError:
                pass
        raise
```

## Verification

```bash
python3 -c "
import asyncio
from pathlib import Path
from backend.app.services import vision
from backend.app.schemas.identification import ItemSelection, ExtractionOptions

async def test():
    items, _ = await vision.identify_elements(Path('demo_assets/case1a_infographies.png'))
    datasets = await vision.extract_data(
        Path('demo_assets/case1a_infographies.png'),
        [ItemSelection(item_id=items[0].item_id)],
        items,
        ExtractionOptions()
    )
    print(f'Extracted {len(datasets)} datasets')

asyncio.run(test())
"
```

Expected: Extracts data successfully without JSON errors.

## Prevention

1. Always use robust JSON parsing for LLM responses
2. Log raw responses for debugging
3. Consider using structured output (GPT-4 JSON mode) in future
