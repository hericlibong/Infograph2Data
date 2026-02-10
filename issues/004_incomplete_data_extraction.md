# Issue 004: Incomplete Data Extraction from Charts

## Status: PARTIALLY RESOLVED ⚠️

## Problem Description

The Vision LLM sometimes extracts incomplete or inaccurate data from complex charts, particularly:

1. **Time series charts**: Missing data points, only extracting annotated values
2. **Stacked bar charts**: Incorrect segment values or missing categories
3. **Grouped bar charts**: Confusion between groups and categories

### Example from error1.png

Chart: "Figure 15 - Grouped bar chart with 7 categories × 3 groups"
Expected: 21 data points (7 × 3)
Actual: Sometimes only 7-10 data points extracted

### Root Causes

1. **Prompt clarity**: The extraction prompts may not be specific enough for complex chart types
2. **Visual complexity**: Charts with many overlapping elements are harder to parse
3. **Annotation reliance**: GPT-4o relies heavily on visible annotations rather than reading from axes
4. **Single-shot extraction**: No verification or refinement step

### Affected Chart Types
- Grouped bar charts
- Stacked bar charts  
- Multi-line time series
- Charts with many data points (>10)

## Mitigations Implemented

### 1. Granularity options
Users can now choose:
- `annotated_only`: Only explicitly labeled values (more reliable)
- `full`: All data points including axis-read values (less reliable)
- `full_with_source`: Same as full but marks source for review

### 2. Improved extraction prompts
The prompts now explicitly request:
- Extraction at every X-axis tick mark
- Separate row per (category, series) combination
- Row count expectations in prompt

### 3. Human-in-the-loop review
The Review page allows users to:
- See which values are "annotated" vs "estimated"
- Edit any incorrect values
- Color-coded cells for quick verification

## Remaining Issues

1. **No automatic validation**: System doesn't detect when extraction is incomplete
2. **No retry with different prompt**: If first extraction fails, no automatic refinement
3. **No chart-type-specific prompts**: Same prompt used for all chart types

## Recommendations for Future

1. Implement chart-type-specific extraction prompts
2. Add validation step that checks row count vs. expected
3. Consider multi-pass extraction (identify → extract → verify)
4. Add option to manually specify expected data structure

## Workarounds for Users

1. Use `annotated_only` granularity for charts with many annotations
2. Use `full_with_source` and focus review on "estimated" values
3. If extraction fails, try re-analyzing the image
4. For complex infographics, extract elements one at a time
