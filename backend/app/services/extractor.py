"""Extraction orchestrator service."""

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.app.config import settings
from backend.app.schemas.dataset import Dataset
from backend.app.schemas.extraction import ExtractionStrategy, JobStatus
from backend.app.services import pdf as pdf_service


def get_datasets_path() -> Path:
    """Get the datasets storage directory."""
    path = Path(settings.storage_dir) / "datasets"
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_jobs_path() -> Path:
    """Get the jobs storage directory."""
    path = Path(settings.storage_dir) / "jobs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_job(job: dict) -> None:
    """Save job state to disk."""
    job_path = get_jobs_path() / f"{job['job_id']}.json"
    job_path.write_text(json.dumps(job, default=str, indent=2))


def load_job(job_id: str) -> dict | None:
    """Load job state from disk."""
    job_path = get_jobs_path() / f"{job_id}.json"
    if not job_path.exists():
        return None
    return json.loads(job_path.read_text())


def save_dataset(dataset: Dataset) -> None:
    """Save dataset to disk."""
    dataset_path = get_datasets_path() / f"{dataset.id}.json"
    dataset_path.write_text(dataset.model_dump_json(indent=2))


def load_dataset(dataset_id: str) -> Dataset | None:
    """Load dataset from disk."""
    dataset_path = get_datasets_path() / f"{dataset_id}.json"
    if not dataset_path.exists():
        return None
    data = json.loads(dataset_path.read_text())
    return Dataset(**data)


def parse_table_from_text(text: str) -> tuple[list[str], list[dict]]:
    """
    Attempt to parse tabular data from text.

    Uses heuristics to detect:
    - Lines with consistent delimiters (tabs, pipes, multiple spaces)
    - Key-value pairs (label: value)

    Returns:
        Tuple of (columns, rows)
    """
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    if not lines:
        return [], []

    # Try tab-delimited first
    tab_counts = [line.count("\t") for line in lines]
    if tab_counts and min(tab_counts) > 0 and max(tab_counts) == min(tab_counts):
        return _parse_delimited(lines, "\t")

    # Try pipe-delimited
    pipe_counts = [line.count("|") for line in lines]
    if pipe_counts and min(pipe_counts) > 1:
        return _parse_delimited(lines, "|")

    # Try multiple-space delimited (common in PDF tables)
    space_pattern = re.compile(r"\s{2,}")
    space_lines = [space_pattern.split(line) for line in lines]
    col_counts = [len(parts) for parts in space_lines]

    if col_counts and min(col_counts) > 1 and max(col_counts) - min(col_counts) <= 1:
        # Consistent column count, likely a table
        max_cols = max(col_counts)
        columns = [f"Column_{i+1}" for i in range(max_cols)]

        # Check if first line looks like headers
        first_parts = space_lines[0]
        if all(not part[0].isdigit() for part in first_parts if part):
            columns = first_parts
            space_lines = space_lines[1:]

        rows = []
        for i, parts in enumerate(space_lines):
            row = {"row_id": i + 1}
            for j, col in enumerate(columns):
                if j < len(parts):
                    row[col] = parts[j].strip()
                else:
                    row[col] = ""
            rows.append(row)

        return columns, rows

    # Try key-value extraction
    kv_pattern = re.compile(r"^(.+?):\s*(.+)$")
    kv_pairs = []
    for line in lines:
        match = kv_pattern.match(line)
        if match:
            kv_pairs.append((match.group(1).strip(), match.group(2).strip()))

    if len(kv_pairs) >= 2:
        columns = ["Key", "Value"]
        rows = [
            {"row_id": i + 1, "Key": k, "Value": v} for i, (k, v) in enumerate(kv_pairs)
        ]
        return columns, rows

    # Fallback: each line is a row with single column
    columns = ["Text"]
    rows = [{"row_id": i + 1, "Text": line} for i, line in enumerate(lines)]
    return columns, rows


def _parse_delimited(lines: list[str], delimiter: str) -> tuple[list[str], list[dict]]:
    """Parse delimiter-separated lines into columns and rows."""
    split_lines = [[cell.strip() for cell in line.split(delimiter)] for line in lines]

    # First line as headers
    columns = split_lines[0] if split_lines else []
    columns = [c if c else f"Column_{i+1}" for i, c in enumerate(columns)]

    rows = []
    for i, parts in enumerate(split_lines[1:]):
        row = {"row_id": i + 1}
        for j, col in enumerate(columns):
            if j < len(parts):
                row[col] = parts[j]
            else:
                row[col] = ""
        rows.append(row)

    return columns, rows


def run_extraction(
    file_path: Path,
    file_id: str,
    page: int,
    bbox: list[float] | None = None,
    strategy: ExtractionStrategy = ExtractionStrategy.AUTO,
) -> tuple[dict, Dataset | None]:
    """
    Run extraction on a file.

    Returns:
        Tuple of (job_state, dataset or None)
    """
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    dataset_id = f"ds-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    job = {
        "job_id": job_id,
        "dataset_id": dataset_id,
        "file_id": file_id,
        "page": page,
        "bbox": bbox,
        "status": JobStatus.RUNNING.value,
        "strategy_requested": strategy.value,
        "strategy_used": None,
        "created_at": now.isoformat(),
        "completed_at": None,
        "error": None,
        "logs": [],
    }

    def log(msg: str):
        job["logs"].append(msg)

    try:
        log(f"Starting extraction on page {page}")

        # Check if file is PDF
        if not str(file_path).lower().endswith(".pdf"):
            log("File is an image, would need OCR")
            job["status"] = JobStatus.NEEDS_OCR.value
            job["completed_at"] = datetime.now(timezone.utc).isoformat()
            save_job(job)
            return job, None

        # Check for text layer
        has_text = pdf_service.page_has_text(file_path, page)
        log(f"Page has text layer: {has_text}")

        if strategy == ExtractionStrategy.AUTO:
            if has_text:
                strategy = ExtractionStrategy.PDF_TEXT
                log("Auto-selected strategy: pdf_text")
            else:
                log("No text layer found, OCR or Vision LLM needed")
                job["status"] = JobStatus.NEEDS_OCR.value
                job["completed_at"] = datetime.now(timezone.utc).isoformat()
                save_job(job)
                return job, None

        if strategy == ExtractionStrategy.PDF_TEXT:
            if not has_text:
                job["status"] = JobStatus.NEEDS_OCR.value
                job["error"] = "PDF page has no extractable text"
                job["completed_at"] = datetime.now(timezone.utc).isoformat()
                save_job(job)
                return job, None

            # Extract text
            raw_text = pdf_service.extract_page_text(file_path, page, bbox)
            log(f"Extracted {len(raw_text)} characters")

            # Extract text blocks for structure analysis
            blocks = pdf_service.extract_text_blocks(file_path, page, bbox)
            log(f"Found {len(blocks)} text blocks")

            # Parse into table structure
            columns, rows = parse_table_from_text(raw_text)
            log(f"Parsed {len(rows)} rows with {len(columns)} columns")

            # Create dataset
            dataset = Dataset(
                id=dataset_id,
                job_id=job_id,
                file_id=file_id,
                page=page,
                bbox=bbox,
                strategy_used=ExtractionStrategy.PDF_TEXT.value,
                created_at=now,
                updated_at=now,
                columns=columns,
                rows=rows,
                raw_text=raw_text,
                confidence=0.8 if len(rows) > 0 else 0.3,
            )

            save_dataset(dataset)
            job["status"] = JobStatus.COMPLETED.value
            job["strategy_used"] = ExtractionStrategy.PDF_TEXT.value
            job["completed_at"] = datetime.now(timezone.utc).isoformat()
            log("Extraction completed successfully")
            save_job(job)
            return job, dataset

        elif strategy == ExtractionStrategy.OCR:
            job["status"] = JobStatus.FAILED.value
            job["error"] = "OCR strategy not yet implemented"
            job["completed_at"] = datetime.now(timezone.utc).isoformat()
            save_job(job)
            return job, None

        elif strategy == ExtractionStrategy.VISION_LLM:
            job["status"] = JobStatus.FAILED.value
            job["error"] = "Vision LLM strategy not yet implemented"
            job["completed_at"] = datetime.now(timezone.utc).isoformat()
            save_job(job)
            return job, None

    except Exception as e:
        job["status"] = JobStatus.FAILED.value
        job["error"] = str(e)
        job["completed_at"] = datetime.now(timezone.utc).isoformat()
        log(f"Error: {e}")
        save_job(job)
        return job, None

    return job, None
