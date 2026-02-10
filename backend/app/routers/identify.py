"""Router for Vision LLM identification and extraction endpoints."""

import logging
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.app.config import settings
from backend.app.schemas.identification import (
    ExtractedDataset,
    ExtractRunRequest,
    ExtractRunResponse,
    IdentificationResponse,
    IdentifyRequest,
    ItemSelection,
    StoredIdentification,
)
from backend.app.services import pdf, storage, vision
from backend.app.services.extractor import save_dataset
from backend.app.schemas.dataset import Dataset

router = APIRouter(prefix="/extract", tags=["Vision LLM Extraction"])
logger = logging.getLogger(__name__)


@router.post("/identify", response_model=IdentificationResponse)
async def identify_elements(request: IdentifyRequest):
    """
    Step 1: Identify visual elements in an image or PDF page.
    
    Returns a list of detected elements (charts, tables, KPIs) with their
    bounding boxes and metadata. User should confirm which elements to extract.
    """
    start_time = time.time()
    
    # Check if Vision LLM is configured
    if not vision.is_vision_configured():
        raise HTTPException(
            status_code=503,
            detail="Vision LLM not configured. Set OPENAI_API_KEY in environment.",
        )
    
    # Get file metadata
    file_meta = storage.get_file_metadata(request.file_id)
    if not file_meta:
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_id}")
    
    file_path = storage.get_file_path(request.file_id)
    if not file_path:
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_id}")
    
    # Determine image path
    if file_meta.mime_type == "application/pdf":
        # PDF: render the specified page to image
        if request.page is None:
            raise HTTPException(
                status_code=400,
                detail="Page number required for PDF files",
            )
        
        if file_meta.pages and request.page > file_meta.pages:
            raise HTTPException(
                status_code=400,
                detail=f"Page {request.page} out of range (1-{file_meta.pages})",
            )
        
        # Render PDF page to image
        result = pdf.render_page(file_path, request.page, scale=2.0, format="png")
        if not result:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to render PDF page {request.page}",
            )
        image_bytes, _ = result  # Unpack tuple (bytes, content_type)
        
        # Save rendered image temporarily
        ident_dir = vision.get_identifications_dir()
        image_filename = f"{request.file_id}_page{request.page}.png"
        image_path = ident_dir / image_filename
        with open(image_path, "wb") as f:
            f.write(image_bytes)
    else:
        # Image file: use directly
        image_path = Path(file_path)
    
    try:
        # Call Vision LLM to identify elements
        detected_items, dimensions = await vision.identify_elements(image_path)
        
        # Create identification record
        identification_id = vision.create_identification_id()
        expires_at = vision.get_identification_expiry()
        
        stored = StoredIdentification(
            identification_id=identification_id,
            file_id=request.file_id,
            page=request.page,
            image_dimensions=dimensions,
            detected_items=detected_items,
            image_path=str(image_path),
            status="awaiting_confirmation",
            expires_at=expires_at,
        )
        
        # Save to disk
        vision.save_identification(stored)
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        return IdentificationResponse(
            identification_id=identification_id,
            file_id=request.file_id,
            page=request.page,
            image_dimensions=dimensions,
            detected_items=detected_items,
            status="awaiting_confirmation",
            expires_at=expires_at,
            duration_ms=duration_ms,
        )
        
    except RuntimeError as e:
        # Known errors from vision service (timeout, API errors)
        logger.warning(f"Vision LLM error: {e}")
        raise HTTPException(
            status_code=504,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Vision LLM identification failed unexpectedly")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get("/identify/{identification_id}", response_model=IdentificationResponse)
async def get_identification(identification_id: str):
    """Retrieve an existing identification by ID."""
    stored = vision.load_identification(identification_id)
    if not stored:
        raise HTTPException(
            status_code=404,
            detail=f"Identification not found: {identification_id}",
        )
    
    # Check expiry
    if datetime.now(timezone.utc) > stored.expires_at:
        raise HTTPException(
            status_code=410,
            detail="Identification expired. Please re-identify.",
        )
    
    return IdentificationResponse(
        identification_id=stored.identification_id,
        file_id=stored.file_id,
        page=stored.page,
        image_dimensions=stored.image_dimensions,
        detected_items=stored.detected_items,
        status=stored.status,
        expires_at=stored.expires_at,
        created_at=stored.created_at,
    )


@router.post("/run", response_model=ExtractRunResponse)
async def run_extraction(request: ExtractRunRequest):
    """
    Step 2: Extract data from confirmed elements.
    
    Takes the identification ID and a list of items (with optional overrides)
    and extracts structured data from each element.
    """
    start_time = time.time()
    
    # Check if Vision LLM is configured
    if not vision.is_vision_configured():
        raise HTTPException(
            status_code=503,
            detail="Vision LLM not configured. Set OPENAI_API_KEY in environment.",
        )
    
    # Load identification
    stored = vision.load_identification(request.identification_id)
    if not stored:
        raise HTTPException(
            status_code=404,
            detail=f"Identification not found: {request.identification_id}",
        )
    
    # Check expiry
    if datetime.now(timezone.utc) > stored.expires_at:
        raise HTTPException(
            status_code=410,
            detail="Identification expired. Please re-identify.",
        )
    
    # Validate user-added items have bbox
    for item in request.items:
        if item.item_id.startswith("new-") and not item.bbox:
            raise HTTPException(
                status_code=400,
                detail=f"User-added item {item.item_id} requires bbox",
            )
    
    image_path = Path(stored.image_path)
    if not image_path.exists():
        raise HTTPException(
            status_code=500,
            detail="Identification image no longer available",
        )
    
    try:
        # Call Vision LLM to extract data
        extracted_datasets = await vision.extract_data(
            image_path=image_path,
            items=request.items,
            stored_items=stored.detected_items,
            options=request.options,
        )
        
        # Save each dataset to storage (for review/export flow)
        import re
        from datetime import datetime as dt
        for ds in extracted_datasets:
            # Build rows as dict list (matching Dataset schema)
            dataset_rows = []
            for idx, row in enumerate(ds.rows):
                row_data = {k: v for k, v in row.items() if k != "row_id"}
                # Handle row_id: extract numeric part or use index
                raw_id = row.get("row_id", idx + 1)
                if isinstance(raw_id, int):
                    row_id = raw_id
                elif isinstance(raw_id, str):
                    match = re.search(r'\d+', raw_id)
                    row_id = int(match.group()) if match else idx + 1
                else:
                    row_id = idx + 1
                row_data["row_id"] = row_id
                dataset_rows.append(row_data)
            
            now = dt.now()
            dataset = Dataset(
                id=ds.dataset_id,
                file_id=stored.file_id,
                page=stored.page if stored.page is not None else 1,
                job_id=f"job-vision-{ds.dataset_id}",
                columns=ds.columns,
                rows=dataset_rows,
                strategy_used="vision_llm",
                created_at=now,
                updated_at=now,
                confidence=ds.metadata.extraction_confidence,
            )
            save_dataset(dataset)
        
        # Generate job ID for this extraction run
        from uuid import uuid4
        job_id = f"job-{uuid4().hex[:12]}"
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        return ExtractRunResponse(
            job_id=job_id,
            identification_id=request.identification_id,
            datasets=extracted_datasets,
            status="completed",
            duration_ms=duration_ms,
        )
    
    except RuntimeError as e:
        # Known errors from vision service (timeout, API errors)
        logger.warning(f"Vision LLM extraction error: {e}")
        raise HTTPException(
            status_code=504,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Vision LLM extraction failed unexpectedly")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}",
        )
