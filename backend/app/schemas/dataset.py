"""Schemas for extracted datasets."""

from datetime import datetime

from pydantic import BaseModel, Field


class DatasetRow(BaseModel):
    """A single row in an extracted dataset."""

    row_id: int = Field(..., description="Unique row identifier")
    # Additional fields are dynamic based on extracted columns


class EditHistoryEntry(BaseModel):
    """A single edit history entry."""

    timestamp: datetime
    action: str = Field(..., description="Action type: create, update, delete")
    changes: dict = Field(default_factory=dict, description="Details of changes made")


class Dataset(BaseModel):
    """An extracted dataset with rows and metadata."""

    id: str = Field(..., description="Dataset UUID")
    job_id: str = Field(..., description="Associated job UUID")
    file_id: str = Field(..., description="Source file UUID")
    page: int = Field(..., description="Source page number")
    bbox: list[float] | None = Field(None, description="Extraction bounding box")
    strategy_used: str = Field(..., description="Strategy that produced this dataset")
    created_at: datetime
    updated_at: datetime
    columns: list[str] = Field(default_factory=list, description="Column names")
    rows: list[dict] = Field(default_factory=list, description="Extracted rows")
    raw_text: str | None = Field(None, description="Original extracted text")
    confidence: float | None = Field(None, ge=0, le=1, description="Extraction confidence")
    edit_history: list[EditHistoryEntry] = Field(default_factory=list, description="Edit history")


class DatasetSummary(BaseModel):
    """Summary of a dataset for listing."""

    id: str
    job_id: str
    file_id: str
    page: int
    row_count: int
    column_count: int
    created_at: datetime


class DatasetUpdate(BaseModel):
    """Request to update a dataset."""

    columns: list[str] | None = Field(None, description="Updated column names")
    rows: list[dict] | None = Field(None, description="Updated rows (full replacement)")
