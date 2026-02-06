"""Export endpoints."""

import csv
import io
import json
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from backend.app.schemas.export import (
    ExportData,
    ExportEdits,
    ExportExtraction,
    ExportManifest,
    ExportSource,
)
from backend.app.services import extractor, storage

router = APIRouter(prefix="/export", tags=["export"])


@router.get(
    "/{dataset_id}",
    summary="Export dataset",
    description="Export a dataset as a ZIP package with CSV, JSON, and manifest.",
    responses={
        200: {
            "content": {"application/zip": {}},
            "description": "ZIP file with exported data",
        }
    },
)
async def export_dataset(
    dataset_id: str,
    formats: str = Query("csv,json", description="Comma-separated formats: csv, json"),
) -> Response:
    """Export a dataset as a ZIP file."""
    # Load dataset
    dataset = extractor.load_dataset(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset not found: {dataset_id}",
        )

    # Load source file metadata
    file_metadata = storage.get_file_metadata(dataset.file_id)
    filename = file_metadata.filename if file_metadata else "unknown"

    # Parse requested formats
    format_list = [f.strip().lower() for f in formats.split(",")]

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Export CSV if requested
        if "csv" in format_list:
            csv_content = _generate_csv(dataset.columns, dataset.rows)
            zf.writestr("data.csv", csv_content)

        # Export JSON if requested
        if "json" in format_list:
            # Clean rows (remove row_id for cleaner export)
            clean_rows = []
            for row in dataset.rows:
                clean_row = {k: v for k, v in row.items() if k != "row_id"}
                clean_rows.append(clean_row)
            json_content = json.dumps(clean_rows, indent=2, ensure_ascii=False)
            zf.writestr("data.json", json_content)

        # Always include manifest
        manifest = _build_manifest(dataset, filename)
        manifest_content = manifest.model_dump_json(indent=2)
        zf.writestr("manifest.json", manifest_content)

    # Prepare response
    zip_buffer.seek(0)
    zip_bytes = zip_buffer.getvalue()

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{dataset_id}.zip"',
        },
    )


def _generate_csv(columns: list[str], rows: list[dict]) -> str:
    """Generate CSV content from columns and rows."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Write header
    writer.writerow(columns)

    # Write data rows
    for row in rows:
        row_values = [row.get(col, "") for col in columns]
        writer.writerow(row_values)

    return output.getvalue()


def _build_manifest(dataset, filename: str) -> ExportManifest:
    """Build export manifest with provenance."""
    now = datetime.now(timezone.utc)

    # Get edit history
    edit_history = []
    last_edited = None
    if hasattr(dataset, "edit_history") and dataset.edit_history:
        edit_history = [e.model_dump() if hasattr(e, "model_dump") else e for e in dataset.edit_history]
        if edit_history:
            last_edited = dataset.updated_at

    return ExportManifest(
        dataset_id=dataset.id,
        exported_at=now,
        source=ExportSource(
            file_id=dataset.file_id,
            filename=filename,
            page=dataset.page,
            bbox=dataset.bbox,
        ),
        extraction=ExportExtraction(
            job_id=dataset.job_id,
            strategy=dataset.strategy_used,
            extracted_at=dataset.created_at,
            confidence=dataset.confidence,
        ),
        data=ExportData(
            columns=dataset.columns,
            row_count=len(dataset.rows),
        ),
        edits=ExportEdits(
            total_edits=len(edit_history),
            last_edited_at=last_edited,
            history=edit_history,
        ),
    )
