"""Dataset review endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.dataset import Dataset, DatasetUpdate, EditHistoryEntry
from backend.app.services import extractor

router = APIRouter(prefix="/datasets", tags=["review"])


@router.get(
    "/{dataset_id}",
    response_model=Dataset,
    summary="Get dataset",
    description="Get an extracted dataset for review.",
)
async def get_dataset(dataset_id: str) -> Dataset:
    """Get a dataset by ID."""
    dataset = extractor.load_dataset(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset not found: {dataset_id}",
        )
    return dataset


@router.put(
    "/{dataset_id}",
    response_model=Dataset,
    summary="Update dataset",
    description="Update a dataset with user edits.",
)
async def update_dataset(dataset_id: str, update: DatasetUpdate) -> Dataset:
    """Update a dataset with user edits."""
    dataset = extractor.load_dataset(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset not found: {dataset_id}",
        )

    # Track changes for history
    changes = {}
    now = datetime.now(timezone.utc)

    # Update columns if provided
    if update.columns is not None:
        old_cols = set(dataset.columns)
        new_cols = set(update.columns)
        changes["columns_added"] = list(new_cols - old_cols)
        changes["columns_removed"] = list(old_cols - new_cols)
        dataset.columns = update.columns

    # Update rows if provided
    if update.rows is not None:
        old_row_ids = {r.get("row_id") for r in dataset.rows}
        new_row_ids = {r.get("row_id") for r in update.rows}

        changes["rows_added"] = len(new_row_ids - old_row_ids)
        changes["rows_removed"] = len(old_row_ids - new_row_ids)
        changes["rows_modified"] = len(update.rows)
        dataset.rows = update.rows

    # Add history entry
    if changes:
        history_entry = EditHistoryEntry(
            timestamp=now,
            action="update",
            changes=changes,
        )
        # Convert to dict for storage since edit_history might not exist
        dataset_dict = dataset.model_dump()
        if "edit_history" not in dataset_dict or dataset_dict["edit_history"] is None:
            dataset_dict["edit_history"] = []
        dataset_dict["edit_history"].append(history_entry.model_dump())
        dataset_dict["updated_at"] = now

        # Rebuild dataset with updated history
        dataset = Dataset(**dataset_dict)

    # Save updated dataset
    extractor.save_dataset(dataset)

    return dataset


@router.get(
    "",
    response_model=list[Dataset],
    summary="List datasets",
    description="List all extracted datasets.",
)
async def list_datasets() -> list[Dataset]:
    """List all datasets."""
    return extractor.list_datasets()
