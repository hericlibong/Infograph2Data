"""Vision LLM service for identifying and extracting data from images."""

import base64
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from openai import OpenAI

from backend.app.config import settings
from backend.app.schemas.identification import (
    BoundingBox,
    DetectedItem,
    ElementType,
    ExtractionMetadata,
    ExtractedDataset,
    ImageDimensions,
    ItemSelection,
    StoredIdentification,
)

logger = logging.getLogger(__name__)


# --- Prompts ---

IDENTIFICATION_PROMPT = """You are a data extraction assistant. Analyze this image and identify all data visualizations and infographics present.

For each distinct element, provide:
1. type: one of [bar_chart, grouped_bar_chart, stacked_bar_chart, line_chart, multi_line_chart, pie_chart, table, kpi_panel, map_data, other]
2. title: the title or heading of this element (if visible), or null if not visible
3. description: brief description of what data it contains
4. data_preview: estimated structure (e.g., "5 categories, 3 series", "12 monthly values")
5. bbox: bounding box as {"x": int, "y": int, "width": int, "height": int} in pixels from top-left
6. confidence: 0.0-1.0 how confident you are in this detection
7. warnings: array of any concerns about extraction accuracy (empty array if none)

Respond ONLY with valid JSON in this exact format:
{
  "detected_items": [
    {
      "type": "bar_chart",
      "title": "Sales by Region",
      "description": "Bar chart showing sales figures for 5 regions",
      "data_preview": "5 categories, single value each",
      "bbox": {"x": 100, "y": 50, "width": 400, "height": 300},
      "confidence": 0.95,
      "warnings": []
    }
  ],
  "image_width": 1000,
  "image_height": 800
}

Important rules:
- Identify SEPARATE elements, not one merged infographic
- Include standalone KPIs/metrics as kpi_panel type
- Note if values are annotated on the chart vs. need to be read from axes (add to warnings)
- bbox coordinates must be integers
- If no visual elements found, return {"detected_items": [], "image_width": ..., "image_height": ...}
"""

EXTRACTION_PROMPT_TEMPLATE = """You are a data extraction assistant. Extract structured data from the specified elements in this image.

Elements to extract:
{items_json}

For each element, extract ALL numeric data into a structured table format.

Rules:
- Use the exact values shown (do not round or approximate)
- If values must be read from an axis (not annotated), add a note about accuracy
- Column names should be clear and descriptive
- Each row should be a dictionary with column names as keys
- Preserve the original meaning and context

Respond ONLY with valid JSON in this exact format:
{{
  "extractions": [
    {{
      "item_id": "item-1",
      "title": "Detected or user-provided title",
      "columns": ["Category", "Value", "Percentage"],
      "rows": [
        {{"Category": "A", "Value": 100, "Percentage": 25.5}},
        {{"Category": "B", "Value": 200, "Percentage": 50.0}}
      ],
      "confidence": 0.95,
      "notes": null
    }}
  ]
}}

Important:
- Extract ALL visible data, not just a sample
- Numbers should be actual numbers, not strings (unless they contain units)
- Percentages should be numbers (e.g., 25.5 not "25.5%")
- If a value cannot be read precisely, note it in the "notes" field
"""


def is_vision_configured() -> bool:
    """Check if Vision LLM is configured."""
    return settings.openai_api_key is not None and len(settings.openai_api_key) > 10


def get_openai_client() -> OpenAI:
    """Get configured OpenAI client."""
    if not is_vision_configured():
        raise RuntimeError("OpenAI API key not configured")
    return OpenAI(api_key=settings.openai_api_key)


def encode_image_base64(image_path: Path) -> str:
    """Encode image file to base64 string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_image_mime_type(image_path: Path) -> str:
    """Get MIME type for image file."""
    suffix = image_path.suffix.lower()
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    return mime_types.get(suffix, "image/png")


async def identify_elements(image_path: Path) -> tuple[list[DetectedItem], ImageDimensions]:
    """
    Identify visual elements in an image using Vision LLM.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Tuple of (detected items, image dimensions)
    """
    if not is_vision_configured():
        raise RuntimeError("Vision LLM not configured. Set OPENAI_API_KEY in environment.")
    
    client = get_openai_client()
    image_data = encode_image_base64(image_path)
    mime_type = get_image_mime_type(image_path)
    
    logger.info(f"Identifying elements in image: {image_path}")
    
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": IDENTIFICATION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=4096,
        timeout=settings.vision_timeout,
    )
    
    # Parse response
    content = response.choices[0].message.content
    logger.debug(f"Vision LLM response: {content}")
    
    # Extract JSON from response (handle markdown code blocks)
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]
    
    data = json.loads(content.strip())
    
    # Build detected items
    items = []
    for i, item_data in enumerate(data.get("detected_items", [])):
        item_id = f"item-{i + 1}"
        
        # Parse element type
        type_str = item_data.get("type", "other")
        try:
            element_type = ElementType(type_str)
        except ValueError:
            element_type = ElementType.OTHER
        
        # Parse bbox
        bbox_data = item_data.get("bbox", {})
        bbox = BoundingBox(
            x=int(bbox_data.get("x", 0)),
            y=int(bbox_data.get("y", 0)),
            width=int(bbox_data.get("width", 100)),
            height=int(bbox_data.get("height", 100)),
        )
        
        item = DetectedItem(
            item_id=item_id,
            type=element_type,
            title=item_data.get("title"),
            description=item_data.get("description", ""),
            data_preview=item_data.get("data_preview", ""),
            bbox=bbox,
            confidence=float(item_data.get("confidence", 0.5)),
            warnings=item_data.get("warnings", []),
        )
        items.append(item)
    
    dimensions = ImageDimensions(
        width=int(data.get("image_width", 1000)),
        height=int(data.get("image_height", 800)),
    )
    
    logger.info(f"Identified {len(items)} elements")
    return items, dimensions


async def extract_data(
    image_path: Path,
    items: list[ItemSelection],
    stored_items: list[DetectedItem],
    options: dict,
) -> list[ExtractedDataset]:
    """
    Extract structured data from specified elements.
    
    Args:
        image_path: Path to the image file
        items: User-confirmed items to extract
        stored_items: Original detected items (for reference)
        options: Extraction options (merge_datasets, output_language)
        
    Returns:
        List of extracted datasets
    """
    if not is_vision_configured():
        raise RuntimeError("Vision LLM not configured. Set OPENAI_API_KEY in environment.")
    
    # Build items description for the prompt
    items_for_prompt = []
    stored_items_map = {item.item_id: item for item in stored_items}
    
    for selection in items:
        if selection.item_id.startswith("new-"):
            # User-added item
            items_for_prompt.append({
                "item_id": selection.item_id,
                "type": selection.type.value if selection.type else "other",
                "title": selection.title or "User-specified element",
                "bbox": selection.bbox.model_dump() if selection.bbox else None,
            })
        else:
            # Existing item with possible overrides
            original = stored_items_map.get(selection.item_id)
            if original:
                items_for_prompt.append({
                    "item_id": selection.item_id,
                    "type": (selection.type or original.type).value,
                    "title": selection.title or original.title or "Untitled",
                    "bbox": original.bbox.model_dump(),
                })
    
    client = get_openai_client()
    image_data = encode_image_base64(image_path)
    mime_type = get_image_mime_type(image_path)
    
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(items_json=json.dumps(items_for_prompt, indent=2))
    
    logger.info(f"Extracting data from {len(items_for_prompt)} elements")
    
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=8192,
        timeout=settings.vision_timeout,
    )
    
    # Parse response
    content = response.choices[0].message.content
    logger.debug(f"Extraction response: {content}")
    
    # Extract JSON
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]
    
    data = json.loads(content.strip())
    
    # Build datasets
    datasets = []
    items_for_prompt_map = {item["item_id"]: item for item in items_for_prompt}
    
    for extraction in data.get("extractions", []):
        item_id = extraction.get("item_id")
        item_info = items_for_prompt_map.get(item_id, {})
        
        # Get original bbox
        original_item = stored_items_map.get(item_id)
        source_bbox = original_item.bbox if original_item else None
        
        # Parse element type
        type_str = item_info.get("type", "other")
        try:
            element_type = ElementType(type_str)
        except ValueError:
            element_type = ElementType.OTHER
        
        # Add row_id to each row
        rows = []
        for i, row in enumerate(extraction.get("rows", [])):
            row_with_id = {"row_id": f"r{i + 1}", **row}
            rows.append(row_with_id)
        
        dataset = ExtractedDataset(
            dataset_id=f"ds-{uuid4().hex[:12]}",
            source_item_id=item_id,
            title=extraction.get("title") or item_info.get("title") or "Untitled",
            type=element_type,
            columns=extraction.get("columns", []),
            rows=rows,
            metadata=ExtractionMetadata(
                source_bbox=source_bbox,
                extraction_confidence=float(extraction.get("confidence", 0.8)),
                notes=extraction.get("notes"),
            ),
        )
        datasets.append(dataset)
    
    logger.info(f"Extracted {len(datasets)} datasets")
    
    # Handle merge option
    if options.get("merge_datasets") and len(datasets) > 1:
        datasets = [_merge_datasets(datasets)]
    
    return datasets


def _merge_datasets(datasets: list[ExtractedDataset]) -> ExtractedDataset:
    """Merge multiple datasets into one."""
    merged_rows = []
    source_items = []
    
    for ds in datasets:
        source_items.append(ds.source_item_id)
        for row in ds.rows:
            merged_row = {
                "row_id": f"r{len(merged_rows) + 1}",
                "Source": ds.source_item_id,
                "Category": ds.title,
                **{k: v for k, v in row.items() if k != "row_id"},
            }
            merged_rows.append(merged_row)
    
    # Collect all unique columns
    all_columns = ["Source", "Category"]
    for ds in datasets:
        for col in ds.columns:
            if col not in all_columns:
                all_columns.append(col)
    
    return ExtractedDataset(
        dataset_id=f"ds-{uuid4().hex[:12]}",
        source_item_id=",".join(source_items),
        title="Merged extraction",
        type=ElementType.OTHER,
        columns=all_columns,
        rows=merged_rows,
        metadata=ExtractionMetadata(
            source_bbox=None,
            extraction_confidence=sum(ds.metadata.extraction_confidence for ds in datasets) / len(datasets),
            notes=f"Merged from {len(datasets)} datasets",
        ),
    )


# --- Storage functions ---


def get_identifications_dir() -> Path:
    """Get the identifications storage directory."""
    path = Path(settings.storage_dir) / "identifications"
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_identification(identification: StoredIdentification) -> None:
    """Save identification to disk."""
    path = get_identifications_dir() / f"{identification.identification_id}.json"
    with open(path, "w") as f:
        f.write(identification.model_dump_json(indent=2))


def load_identification(identification_id: str) -> StoredIdentification | None:
    """Load identification from disk."""
    path = get_identifications_dir() / f"{identification_id}.json"
    if not path.exists():
        return None
    
    with open(path) as f:
        data = json.load(f)
    
    return StoredIdentification(**data)


def create_identification_id() -> str:
    """Generate a unique identification ID."""
    return f"ident-{uuid4().hex[:12]}"


def get_identification_expiry() -> datetime:
    """Get expiry time for new identification."""
    return datetime.utcnow() + timedelta(seconds=settings.identification_ttl)
