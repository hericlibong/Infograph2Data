"""Extraction and preview endpoints."""

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from backend.app.schemas.extraction import (
    ExtractRequest,
    ExtractResponse,
    JobResponse,
    JobStatus,
    PagesResponse,
)
from backend.app.services import extractor, pdf as pdf_service, storage

router = APIRouter(tags=["extraction"])


@router.get(
    "/files/{file_id}/pages",
    response_model=PagesResponse,
    summary="Get PDF page information",
    description="Get information about all pages in a PDF file.",
)
async def get_pages(file_id: str) -> PagesResponse:
    """Get page information for a PDF file."""
    metadata = storage.get_file_metadata(file_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_id}",
        )

    if metadata.mime_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a PDF",
        )

    file_path = storage.get_file_path(file_id)
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File data not found: {file_id}",
        )

    pages = pdf_service.get_pages_info(file_path)

    return PagesResponse(
        file_id=file_id,
        filename=metadata.filename,
        total_pages=len(pages),
        pages=pages,
    )


@router.get(
    "/files/{file_id}/pages/{page}/preview",
    summary="Preview PDF page",
    description="Render a PDF page as an image.",
    responses={
        200: {
            "content": {"image/png": {}, "image/jpeg": {}},
            "description": "Page rendered as image",
        }
    },
)
async def preview_page(
    file_id: str,
    page: int,
    scale: float = Query(1.5, ge=0.5, le=4.0, description="Render scale"),
    format: str = Query("png", pattern="^(png|jpeg)$", description="Image format"),
) -> Response:
    """Render a PDF page as an image."""
    metadata = storage.get_file_metadata(file_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_id}",
        )

    if metadata.mime_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a PDF",
        )

    file_path = storage.get_file_path(file_id)
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File data not found: {file_id}",
        )

    try:
        img_bytes, content_type = pdf_service.render_page(file_path, page, scale, format)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return Response(content=img_bytes, media_type=content_type)


@router.post(
    "/extract",
    response_model=ExtractResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start extraction job",
    description="Start an extraction job on a file.",
)
async def start_extraction(request: ExtractRequest) -> ExtractResponse:
    """Start an extraction job."""
    metadata = storage.get_file_metadata(request.file_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {request.file_id}",
        )

    file_path = storage.get_file_path(request.file_id)
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File data not found: {request.file_id}",
        )

    # Validate page number for PDFs
    if metadata.mime_type == "application/pdf":
        if metadata.pages and request.page > metadata.pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Page {request.page} out of range (1-{metadata.pages})",
            )

    # Run extraction
    job, dataset = extractor.run_extraction(
        file_path=file_path,
        file_id=request.file_id,
        page=request.page,
        bbox=request.bbox,
        strategy=request.strategy,
    )

    from datetime import datetime

    return ExtractResponse(
        job_id=job["job_id"],
        dataset_id=job["dataset_id"],
        status=JobStatus(job["status"]),
        created_at=datetime.fromisoformat(job["created_at"]),
    )


@router.get(
    "/jobs/{job_id}",
    response_model=JobResponse,
    summary="Get job status",
    description="Get the status of an extraction job.",
)
async def get_job(job_id: str) -> JobResponse:
    """Get extraction job status."""
    job = extractor.load_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}",
        )

    from datetime import datetime

    return JobResponse(
        job_id=job["job_id"],
        dataset_id=job["dataset_id"],
        status=JobStatus(job["status"]),
        strategy_used=job.get("strategy_used"),
        created_at=datetime.fromisoformat(job["created_at"]),
        completed_at=(
            datetime.fromisoformat(job["completed_at"]) if job.get("completed_at") else None
        ),
        error=job.get("error"),
        logs=job.get("logs", []),
    )
