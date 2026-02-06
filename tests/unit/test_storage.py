"""
Unit tests for backend.app.services.storage module.

This module tests:
- File saving and directory creation
- Metadata loading and retrieval
- MIME type validation
- File listing and sorting

Fixtures required:
- temp_storage: Isolated temporary storage directory

Not tested here:
- API endpoints (see integration tests)
- PDF-specific operations (see test_pdf.py)
"""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from backend.app.schemas.upload import FileMetadata
from backend.app.services import storage


class TestMimeTypeValidation:
    """Tests for MIME type validation functions."""

    def test_is_allowed_mime_type_pdf(self):
        """
        PDF MIME type is allowed.

        Given: MIME type 'application/pdf'
        When: is_allowed_mime_type is called
        Then: Returns True
        """
        assert storage.is_allowed_mime_type("application/pdf") is True

    def test_is_allowed_mime_type_png(self):
        """PNG MIME type is allowed."""
        assert storage.is_allowed_mime_type("image/png") is True

    def test_is_allowed_mime_type_jpeg(self):
        """JPEG MIME type is allowed."""
        assert storage.is_allowed_mime_type("image/jpeg") is True

    def test_is_allowed_mime_type_text_rejected(self):
        """Text MIME type is rejected."""
        assert storage.is_allowed_mime_type("text/plain") is False

    def test_is_allowed_mime_type_html_rejected(self):
        """HTML MIME type is rejected."""
        assert storage.is_allowed_mime_type("text/html") is False

    def test_get_extension_for_mime_pdf(self):
        """PDF MIME type returns .pdf extension."""
        assert storage.get_extension_for_mime("application/pdf") == ".pdf"

    def test_get_extension_for_mime_png(self):
        """PNG MIME type returns .png extension."""
        assert storage.get_extension_for_mime("image/png") == ".png"

    def test_get_extension_for_mime_jpeg(self):
        """JPEG MIME type returns .jpg extension."""
        assert storage.get_extension_for_mime("image/jpeg") == ".jpg"

    def test_get_extension_for_mime_unknown(self):
        """Unknown MIME type returns None."""
        assert storage.get_extension_for_mime("application/unknown") is None


class TestSaveFile:
    """Tests for save_file function."""

    def test_save_file_creates_directory(self, temp_storage, sample_pdf):
        """
        Saving a file creates the expected directory structure.

        Given: A PDF file to save
        When: save_file is called
        Then: Creates {uuid}/metadata.json and {uuid}/original.pdf
        """
        metadata = asyncio.run(storage.save_file(
            content=sample_pdf,
            filename="test.pdf",
            mime_type="application/pdf",
        ))

        # Verify directory exists
        file_dir = temp_storage / metadata.id
        assert file_dir.exists()
        assert (file_dir / "metadata.json").exists()
        assert (file_dir / "original.pdf").exists()

    def test_save_file_returns_correct_metadata(self, temp_storage, sample_pdf):
        """
        save_file returns correct FileMetadata.

        Given: A PDF file with known properties
        When: save_file is called
        Then: Returns FileMetadata with correct filename, mime_type, size
        """
        metadata = asyncio.run(storage.save_file(
            content=sample_pdf,
            filename="test.pdf",
            mime_type="application/pdf",
        ))

        assert metadata.filename == "test.pdf"
        assert metadata.mime_type == "application/pdf"
        assert metadata.size_bytes == len(sample_pdf)
        assert metadata.id is not None
        assert metadata.created_at is not None

    def test_save_file_counts_pdf_pages(self, temp_storage, sample_pdf_3pages):
        """
        save_file counts pages for PDF files.

        Given: A 3-page PDF
        When: save_file is called
        Then: Returns metadata with pages=3
        """
        metadata = asyncio.run(storage.save_file(
            content=sample_pdf_3pages,
            filename="multi.pdf",
            mime_type="application/pdf",
        ))

        assert metadata.pages == 3

    def test_save_file_png_no_pages(self, temp_storage, sample_png):
        """
        save_file returns pages=None for images.

        Given: A PNG image
        When: save_file is called
        Then: Returns metadata with pages=None
        """
        metadata = asyncio.run(storage.save_file(
            content=sample_png,
            filename="test.png",
            mime_type="image/png",
        ))

        assert metadata.pages is None


class TestGetFileMetadata:
    """Tests for get_file_metadata function."""

    def test_get_file_metadata_returns_correct_data(self, temp_storage, sample_pdf):
        """
        get_file_metadata returns saved metadata.

        Given: A file has been saved
        When: get_file_metadata is called with its ID
        Then: Returns matching FileMetadata
        """
        saved = asyncio.run(storage.save_file(
            content=sample_pdf,
            filename="test.pdf",
            mime_type="application/pdf",
        ))

        loaded = storage.get_file_metadata(saved.id)

        assert loaded is not None
        assert loaded.id == saved.id
        assert loaded.filename == saved.filename
        assert loaded.mime_type == saved.mime_type
        assert loaded.size_bytes == saved.size_bytes

    def test_get_file_metadata_not_found(self, temp_storage):
        """
        get_file_metadata returns None for non-existent ID.

        Given: A non-existent file ID
        When: get_file_metadata is called
        Then: Returns None
        """
        result = storage.get_file_metadata("nonexistent-uuid")
        assert result is None


class TestGetFilePath:
    """Tests for get_file_path function."""

    def test_get_file_path_returns_correct_path(self, temp_storage, sample_pdf):
        """
        get_file_path returns path to original file.

        Given: A file has been saved
        When: get_file_path is called
        Then: Returns Path to original.<ext>
        """
        saved = asyncio.run(storage.save_file(
            content=sample_pdf,
            filename="test.pdf",
            mime_type="application/pdf",
        ))

        path = storage.get_file_path(saved.id)

        assert path is not None
        assert path.exists()
        assert path.name == "original.pdf"

    def test_get_file_path_not_found(self, temp_storage):
        """
        get_file_path returns None for non-existent ID.

        Given: A non-existent file ID
        When: get_file_path is called
        Then: Returns None
        """
        result = storage.get_file_path("nonexistent-uuid")
        assert result is None


class TestListFiles:
    """Tests for list_files function."""

    def test_list_files_empty(self, temp_storage):
        """
        list_files returns empty list when no files exist.

        Given: No files have been saved
        When: list_files is called
        Then: Returns empty list
        """
        result = storage.list_files()
        assert result == []

    def test_list_files_returns_all(self, temp_storage, sample_pdf, sample_png):
        """
        list_files returns all saved files.

        Given: Multiple files have been saved
        When: list_files is called
        Then: Returns all files
        """
        asyncio.run(storage.save_file(sample_pdf, "a.pdf", "application/pdf"))
        asyncio.run(storage.save_file(sample_png, "b.png", "image/png"))

        result = storage.list_files()

        assert len(result) == 2

    def test_list_files_sorted_by_date(self, temp_storage, sample_pdf):
        """
        list_files returns files sorted by date (newest first).

        Given: Files saved at different times
        When: list_files is called
        Then: Returns newest first
        """
        first = asyncio.run(storage.save_file(sample_pdf, "first.pdf", "application/pdf"))
        second = asyncio.run(storage.save_file(sample_pdf, "second.pdf", "application/pdf"))

        result = storage.list_files()

        assert len(result) == 2
        # Second file should be first (newest)
        assert result[0].filename == "second.pdf"
        assert result[1].filename == "first.pdf"
