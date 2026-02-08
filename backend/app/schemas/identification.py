"""Schemas for Vision LLM identification and extraction workflow."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ElementType(str, Enum):
    """Supported visual element types."""

    BAR_CHART = "bar_chart"
    GROUPED_BAR_CHART = "grouped_bar_chart"
    STACKED_BAR_CHART = "stacked_bar_chart"
    LINE_CHART = "line_chart"
    MULTI_LINE_CHART = "multi_line_chart"
    PIE_CHART = "pie_chart"
    TABLE = "table"
    KPI_PANEL = "kpi_panel"
    MAP_DATA = "map_data"
    OTHER = "other"


class Granularity(str, Enum):
    """Extraction granularity options for time series data."""

    ANNOTATED_ONLY = "annotated_only"  # Only explicitly labeled values
    FULL = "full"  # All data points (annotated + estimated)
    FULL_WITH_SOURCE = "full_with_source"  # All data points with source column


class BoundingBox(BaseModel):
    """Bounding box coordinates for a detected element."""

    x: int = Field(..., description="X coordinate from top-left")
    y: int = Field(..., description="Y coordinate from top-left")
    width: int = Field(..., ge=1, description="Width in pixels")
    height: int = Field(..., ge=1, description="Height in pixels")


class DetectedItem(BaseModel):
    """A visual element detected in an image."""

    item_id: str = Field(..., description="Unique identifier for this item")
    type: ElementType = Field(..., description="Type of visual element")
    title: str | None = Field(None, description="Title or heading if visible")
    description: str = Field(..., description="Brief description of the content")
    data_preview: str = Field(..., description="Estimated data structure")
    bbox: BoundingBox = Field(..., description="Bounding box coordinates")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence")
    warnings: list[str] = Field(default_factory=list, description="Accuracy concerns")


class ImageDimensions(BaseModel):
    """Dimensions of the analyzed image."""

    width: int
    height: int


# --- Request Schemas ---


class IdentifyRequest(BaseModel):
    """Request to identify visual elements in an image or PDF page."""

    file_id: str = Field(..., description="ID of the uploaded file")
    page: int | None = Field(None, ge=1, description="Page number (required for PDFs)")


class ItemSelection(BaseModel):
    """User selection/modification of a detected item for extraction."""

    item_id: str = Field(..., description="ID of the item (from detection or 'new-X' for user-added)")
    title: str | None = Field(None, description="Override title")
    type: ElementType | None = Field(None, description="Override type")
    bbox: BoundingBox | None = Field(None, description="Required for user-added items")


class ExtractionOptions(BaseModel):
    """Options for data extraction."""

    merge_datasets: bool = Field(default=False, description="Merge all extractions into one dataset")
    output_language: str = Field(default="en", description="Output language for column names")
    granularity: Granularity = Field(
        default=Granularity.FULL,
        description="Data granularity: annotated_only, full, or full_with_source",
    )


class ExtractRunRequest(BaseModel):
    """Request to extract data from confirmed items."""

    identification_id: str = Field(..., description="ID from identification step")
    items: list[ItemSelection] = Field(..., min_length=1, description="Items to extract")
    options: ExtractionOptions = Field(
        default_factory=ExtractionOptions,
        description="Extraction options",
    )


# --- Response Schemas ---


class IdentificationResponse(BaseModel):
    """Response from the identification step."""

    identification_id: str = Field(..., description="Unique ID for this identification")
    file_id: str
    page: int | None = None
    image_dimensions: ImageDimensions
    detected_items: list[DetectedItem] = Field(default_factory=list)
    status: str = Field(default="awaiting_confirmation")
    expires_at: datetime = Field(..., description="When this identification expires")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExtractionMetadata(BaseModel):
    """Metadata for an extracted dataset."""

    source_bbox: BoundingBox | None = None
    extraction_confidence: float = Field(..., ge=0.0, le=1.0)
    notes: str | None = None


class ExtractedDataset(BaseModel):
    """A dataset extracted from a visual element."""

    dataset_id: str
    source_item_id: str
    title: str
    type: ElementType
    columns: list[str]
    rows: list[dict]
    metadata: ExtractionMetadata


class ExtractRunResponse(BaseModel):
    """Response from the extraction step."""

    job_id: str
    identification_id: str
    datasets: list[ExtractedDataset] = Field(default_factory=list)
    status: str = Field(default="completed")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- Storage Schemas ---


class StoredIdentification(BaseModel):
    """Identification stored on disk."""

    identification_id: str
    file_id: str
    page: int | None = None
    image_dimensions: ImageDimensions
    detected_items: list[DetectedItem]
    image_path: str  # Path to the rendered image used for identification
    status: str = "awaiting_confirmation"
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
