"""Schemas for extraction jobs."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ExtractionStrategy(str, Enum):
    """Available extraction strategies."""

    AUTO = "auto"
    PDF_TEXT = "pdf_text"
    OCR = "ocr"
    VISION_LLM = "vision_llm"


class JobStatus(str, Enum):
    """Extraction job status values."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_OCR = "needs_ocr"
    NEEDS_VISION = "needs_vision"


class ExtractRequest(BaseModel):
    """Request to start an extraction job."""

    file_id: str = Field(..., description="UUID of the uploaded file")
    page: int = Field(..., ge=1, description="Page number (1-indexed)")
    bbox: list[float] | None = Field(
        None,
        min_length=4,
        max_length=4,
        description="Bounding box [x1, y1, x2, y2] in PDF points",
    )
    strategy: ExtractionStrategy = Field(
        ExtractionStrategy.AUTO,
        description="Extraction strategy to use",
    )


class ExtractResponse(BaseModel):
    """Response after starting an extraction job."""

    job_id: str
    dataset_id: str
    status: JobStatus
    created_at: datetime


class PageInfo(BaseModel):
    """Information about a single PDF page."""

    page: int = Field(..., description="Page number (1-indexed)")
    width: float = Field(..., description="Page width in points")
    height: float = Field(..., description="Page height in points")
    has_text: bool = Field(..., description="Whether page has extractable text")


class PagesResponse(BaseModel):
    """Response with PDF page information."""

    file_id: str
    filename: str
    total_pages: int
    pages: list[PageInfo]


class JobResponse(BaseModel):
    """Extraction job status response."""

    job_id: str
    dataset_id: str
    status: JobStatus
    strategy_used: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None
    logs: list[str] = Field(default_factory=list)
