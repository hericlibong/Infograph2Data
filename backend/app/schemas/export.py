"""Schemas for export functionality."""

from datetime import datetime

from pydantic import BaseModel, Field


class ExportSource(BaseModel):
    """Source file information for export manifest."""

    file_id: str
    filename: str
    page: int
    bbox: list[float] | None = None


class ExportExtraction(BaseModel):
    """Extraction information for export manifest."""

    job_id: str
    strategy: str
    extracted_at: datetime
    confidence: float | None = None


class ExportData(BaseModel):
    """Data summary for export manifest."""

    columns: list[str]
    row_count: int


class ExportEdits(BaseModel):
    """Edit summary for export manifest."""

    total_edits: int
    last_edited_at: datetime | None = None
    history: list[dict] = Field(default_factory=list)


class ExportManifest(BaseModel):
    """Full export manifest with provenance."""

    dataset_id: str
    exported_at: datetime
    source: ExportSource
    extraction: ExportExtraction
    data: ExportData
    edits: ExportEdits
