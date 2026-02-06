"""
Unit tests for backend.app.services.extractor module.

This module tests:
- Table parsing from text (tab, pipe, space, key-value formats)
- Dataset save/load operations
- Job save/load operations
- Dataset listing

Fixtures required:
- temp_storage: Isolated temporary storage directory

Not tested here:
- Full extraction flow (see integration tests)
- PDF operations (see test_pdf.py)
"""

from datetime import datetime, timezone
from pathlib import Path

import pytest

from backend.app.schemas.dataset import Dataset
from backend.app.services import extractor


class TestParseTableFromText:
    """Tests for parse_table_from_text function."""

    def test_parse_table_tab_delimited(self):
        """
        Parse tab-delimited text into table.

        Given: Tab-separated text with header and rows
        When: parse_table_from_text is called
        Then: Returns correct columns and rows

        Proves: Basic table parsing works.
        """
        text = "Name\tAge\tCity\nAlice\t30\tNew York\nBob\t25\tBoston"

        columns, rows = extractor.parse_table_from_text(text)

        assert columns == ["Name", "Age", "City"]
        assert len(rows) == 2
        assert rows[0]["Name"] == "Alice"
        assert rows[0]["Age"] == "30"
        assert rows[1]["Name"] == "Bob"

    def test_parse_table_pipe_delimited(self):
        """
        Parse pipe-delimited text into table.

        Given: Pipe-separated text
        When: parse_table_from_text is called
        Then: Returns correct columns and rows
        """
        text = "Name|Age|City\nAlice|30|NYC\nBob|25|LA"

        columns, rows = extractor.parse_table_from_text(text)

        assert columns == ["Name", "Age", "City"]
        assert len(rows) == 2

    def test_parse_table_space_delimited(self):
        """
        Parse multi-space delimited text into table.

        Given: Text with multiple spaces as delimiters
        When: parse_table_from_text is called
        Then: Detects columns correctly
        """
        text = "Name      Age    City\nAlice     30     NYC\nBob       25     LA"

        columns, rows = extractor.parse_table_from_text(text)

        assert len(columns) == 3
        assert len(rows) == 2

    def test_parse_table_key_value(self):
        """
        Parse key-value pairs into table.

        Given: Lines with "Key: Value" format
        When: parse_table_from_text is called
        Then: Returns Key/Value columns
        """
        text = "Name: Alice\nAge: 30\nCity: NYC"

        columns, rows = extractor.parse_table_from_text(text)

        assert columns == ["Key", "Value"]
        assert len(rows) == 3
        assert rows[0]["Key"] == "Name"
        assert rows[0]["Value"] == "Alice"

    def test_parse_table_fallback_single_column(self):
        """
        Fallback to single column for unstructured text.

        Given: Plain text lines with no clear structure
        When: parse_table_from_text is called
        Then: Returns single "Text" column
        """
        text = "Line one\nLine two\nLine three"

        columns, rows = extractor.parse_table_from_text(text)

        assert columns == ["Text"]
        assert len(rows) == 3
        assert rows[0]["Text"] == "Line one"

    def test_parse_table_empty_text(self):
        """
        Handle empty text gracefully.

        Given: Empty string
        When: parse_table_from_text is called
        Then: Returns empty columns and rows
        """
        columns, rows = extractor.parse_table_from_text("")

        assert columns == []
        assert rows == []

    def test_parse_table_whitespace_only(self):
        """
        Handle whitespace-only text.

        Given: String with only whitespace
        When: parse_table_from_text is called
        Then: Returns empty columns and rows
        """
        columns, rows = extractor.parse_table_from_text("   \n   \n   ")

        assert columns == []
        assert rows == []


class TestSaveAndLoadDataset:
    """Tests for dataset persistence."""

    def test_save_and_load_dataset(self, temp_storage):
        """
        Round-trip dataset save and load.

        Given: A Dataset object
        When: save_dataset then load_dataset are called
        Then: Loaded dataset matches saved
        """
        now = datetime.now(timezone.utc)
        dataset = Dataset(
            id="ds-test-123",
            job_id="job-test-456",
            file_id="file-test-789",
            page=1,
            bbox=None,
            strategy_used="pdf_text",
            created_at=now,
            updated_at=now,
            columns=["A", "B"],
            rows=[{"row_id": 1, "A": "val1", "B": "val2"}],
            raw_text="A\tB\nval1\tval2",
            confidence=0.9,
        )

        extractor.save_dataset(dataset)
        loaded = extractor.load_dataset("ds-test-123")

        assert loaded is not None
        assert loaded.id == dataset.id
        assert loaded.job_id == dataset.job_id
        assert loaded.columns == dataset.columns
        assert loaded.rows == dataset.rows
        assert loaded.confidence == dataset.confidence

    def test_load_dataset_not_found(self, temp_storage):
        """
        load_dataset returns None for non-existent ID.

        Given: A non-existent dataset ID
        When: load_dataset is called
        Then: Returns None
        """
        result = extractor.load_dataset("nonexistent-id")
        assert result is None


class TestSaveAndLoadJob:
    """Tests for job persistence."""

    def test_save_and_load_job(self, temp_storage):
        """
        Round-trip job save and load.

        Given: A job dict
        When: save_job then load_job are called
        Then: Loaded job matches saved
        """
        job = {
            "job_id": "job-test-123",
            "dataset_id": "ds-test-456",
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "logs": ["Step 1", "Step 2"],
        }

        extractor.save_job(job)
        loaded = extractor.load_job("job-test-123")

        assert loaded is not None
        assert loaded["job_id"] == job["job_id"]
        assert loaded["status"] == job["status"]
        assert loaded["logs"] == job["logs"]

    def test_load_job_not_found(self, temp_storage):
        """
        load_job returns None for non-existent ID.

        Given: A non-existent job ID
        When: load_job is called
        Then: Returns None
        """
        result = extractor.load_job("nonexistent-id")
        assert result is None


class TestListDatasets:
    """Tests for list_datasets function."""

    def test_list_datasets_empty(self, temp_storage):
        """
        list_datasets returns empty list when no datasets.

        Given: No datasets saved
        When: list_datasets is called
        Then: Returns empty list
        """
        result = extractor.list_datasets()
        assert result == []

    def test_list_datasets_returns_all(self, temp_storage):
        """
        list_datasets returns all saved datasets.

        Given: Multiple datasets saved
        When: list_datasets is called
        Then: Returns all datasets
        """
        now = datetime.now(timezone.utc)
        for i in range(3):
            dataset = Dataset(
                id=f"ds-{i}",
                job_id=f"job-{i}",
                file_id=f"file-{i}",
                page=1,
                bbox=None,
                strategy_used="pdf_text",
                created_at=now,
                updated_at=now,
                columns=["A"],
                rows=[],
            )
            extractor.save_dataset(dataset)

        result = extractor.list_datasets()
        assert len(result) == 3

    def test_list_datasets_sorted_by_date(self, temp_storage):
        """
        list_datasets returns datasets sorted by date (newest first).

        Given: Datasets with different creation times
        When: list_datasets is called
        Then: Returns newest first
        """
        from datetime import timedelta

        now = datetime.now(timezone.utc)

        # Create older dataset first
        old = Dataset(
            id="ds-old",
            job_id="job-old",
            file_id="file-old",
            page=1,
            bbox=None,
            strategy_used="pdf_text",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(hours=1),
            columns=["A"],
            rows=[],
        )
        extractor.save_dataset(old)

        # Create newer dataset
        new = Dataset(
            id="ds-new",
            job_id="job-new",
            file_id="file-new",
            page=1,
            bbox=None,
            strategy_used="pdf_text",
            created_at=now,
            updated_at=now,
            columns=["A"],
            rows=[],
        )
        extractor.save_dataset(new)

        result = extractor.list_datasets()

        assert len(result) == 2
        assert result[0].id == "ds-new"  # Newest first
        assert result[1].id == "ds-old"
