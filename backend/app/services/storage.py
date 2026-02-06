"""File storage service for uploaded files."""

import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.app.config import settings
from backend.app.schemas.upload import FileMetadata

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
}


def get_storage_path() -> Path:
    """Get the storage directory path, creating it if needed."""
    path = Path(settings.storage_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_extension_for_mime(mime_type: str) -> str | None:
    """Get file extension for a MIME type."""
    return ALLOWED_MIME_TYPES.get(mime_type)


def is_allowed_mime_type(mime_type: str) -> bool:
    """Check if a MIME type is allowed."""
    return mime_type in ALLOWED_MIME_TYPES


def count_pdf_pages(file_path: Path) -> int:
    """Count pages in a PDF file."""
    import fitz  # PyMuPDF

    with fitz.open(file_path) as doc:
        return len(doc)


async def save_file(
    content: bytes,
    filename: str,
    mime_type: str,
) -> FileMetadata:
    """
    Save an uploaded file to storage.

    Creates a UUID directory containing:
    - metadata.json: File metadata
    - original.<ext>: The uploaded file
    """
    file_id = str(uuid.uuid4())
    extension = get_extension_for_mime(mime_type)

    # Create file directory
    file_dir = get_storage_path() / file_id
    file_dir.mkdir(parents=True, exist_ok=True)

    # Save the file
    file_path = file_dir / f"original{extension}"
    file_path.write_bytes(content)

    # Count pages if PDF
    pages = None
    if mime_type == "application/pdf":
        pages = count_pdf_pages(file_path)

    # Build metadata
    metadata = FileMetadata(
        id=file_id,
        filename=filename,
        mime_type=mime_type,
        size_bytes=len(content),
        pages=pages,
        created_at=datetime.now(timezone.utc),
    )

    # Save metadata
    metadata_path = file_dir / "metadata.json"
    metadata_path.write_text(metadata.model_dump_json(indent=2))

    return metadata


def get_file_metadata(file_id: str) -> FileMetadata | None:
    """Load metadata for a file by ID."""
    metadata_path = get_storage_path() / file_id / "metadata.json"

    if not metadata_path.exists():
        return None

    data = json.loads(metadata_path.read_text())
    return FileMetadata(**data)


def get_file_path(file_id: str) -> Path | None:
    """Get the path to the original uploaded file."""
    file_dir = get_storage_path() / file_id

    if not file_dir.exists():
        return None

    # Find the original file (with any extension)
    for ext in ALLOWED_MIME_TYPES.values():
        file_path = file_dir / f"original{ext}"
        if file_path.exists():
            return file_path

    return None


def delete_file(file_id: str) -> bool:
    """Delete a file and its metadata."""
    file_dir = get_storage_path() / file_id

    if not file_dir.exists():
        return False

    shutil.rmtree(file_dir)
    return True


def list_files() -> list[FileMetadata]:
    """List all uploaded files."""
    storage_path = get_storage_path()
    files = []

    for file_dir in storage_path.iterdir():
        if file_dir.is_dir() and (file_dir / "metadata.json").exists():
            metadata = get_file_metadata(file_dir.name)
            if metadata:
                files.append(metadata)

    return sorted(files, key=lambda f: f.created_at, reverse=True)
