"""File upload endpoints."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.app.schemas.upload import FileMetadata, UploadResponse
from backend.app.services import storage

router = APIRouter(prefix="/files", tags=["files"])

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post(
    "",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file",
    description="Upload a PDF, PNG, or JPG file for processing.",
)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    """Upload a file for processing."""
    # Validate MIME type
    if not file.content_type or not storage.is_allowed_mime_type(file.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, PNG, JPG.",
        )

    # Read file content
    content = await file.read()

    # Validate size
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE // (1024 * 1024)} MB.",
        )

    # Save file
    metadata = await storage.save_file(
        content=content,
        filename=file.filename or "untitled",
        mime_type=file.content_type,
    )

    return UploadResponse(**metadata.model_dump())


@router.get(
    "/{file_id}",
    response_model=FileMetadata,
    summary="Get file metadata",
    description="Get metadata for an uploaded file by ID.",
)
async def get_file(file_id: str) -> FileMetadata:
    """Get metadata for an uploaded file."""
    metadata = storage.get_file_metadata(file_id)

    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_id}",
        )

    return metadata


@router.get(
    "",
    response_model=list[FileMetadata],
    summary="List all files",
    description="List all uploaded files, sorted by creation date (newest first).",
)
async def list_files() -> list[FileMetadata]:
    """List all uploaded files."""
    return storage.list_files()
