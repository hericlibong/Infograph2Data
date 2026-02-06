from datetime import datetime

from pydantic import BaseModel, Field


class FileMetadata(BaseModel):
    """Metadata for an uploaded file."""

    id: str = Field(..., description="Unique file identifier (UUID)")
    filename: str = Field(..., description="Original filename")
    mime_type: str = Field(..., description="MIME type of the file")
    size_bytes: int = Field(..., description="File size in bytes")
    pages: int | None = Field(None, description="Number of pages (PDF only)")
    created_at: datetime = Field(..., description="Upload timestamp")


class UploadResponse(FileMetadata):
    """Response returned after successful upload."""

    pass
