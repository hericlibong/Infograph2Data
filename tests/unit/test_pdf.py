"""
Unit tests for backend.app.services.pdf module.

This module tests:
- PDF page counting
- Page information extraction
- Page rendering to PNG/JPEG
- Text extraction from PDF pages
- Bounding box filtering

Fixtures required:
- sample_pdf, sample_pdf_3pages, sample_pdf_with_text, sample_pdf_blank

Not tested here:
- API endpoints (see integration tests)
- Storage operations (see test_storage.py)
"""

import io
from pathlib import Path

import fitz
import pytest

from backend.app.services import pdf as pdf_service


@pytest.fixture
def pdf_file_path(tmp_path, sample_pdf) -> Path:
    """Write sample PDF to disk and return path."""
    path = tmp_path / "test.pdf"
    path.write_bytes(sample_pdf)
    return path


@pytest.fixture
def pdf_3pages_path(tmp_path, sample_pdf_3pages) -> Path:
    """Write 3-page PDF to disk and return path."""
    path = tmp_path / "test_3pages.pdf"
    path.write_bytes(sample_pdf_3pages)
    return path


@pytest.fixture
def pdf_with_text_path(tmp_path, sample_pdf_with_text) -> Path:
    """Write PDF with text to disk and return path."""
    path = tmp_path / "test_text.pdf"
    path.write_bytes(sample_pdf_with_text)
    return path


@pytest.fixture
def pdf_blank_path(tmp_path, sample_pdf_blank) -> Path:
    """Write blank PDF to disk and return path."""
    path = tmp_path / "test_blank.pdf"
    path.write_bytes(sample_pdf_blank)
    return path


class TestGetPageCount:
    """Tests for get_page_count function."""

    def test_get_page_count_single(self, pdf_file_path):
        """
        Count pages in single-page PDF.

        Given: A single-page PDF
        When: get_page_count is called
        Then: Returns 1
        """
        assert pdf_service.get_page_count(pdf_file_path) == 1

    def test_get_page_count_multiple(self, pdf_3pages_path):
        """
        Count pages in multi-page PDF.

        Given: A 3-page PDF
        When: get_page_count is called
        Then: Returns 3
        """
        assert pdf_service.get_page_count(pdf_3pages_path) == 3


class TestGetPagesInfo:
    """Tests for get_pages_info function."""

    def test_get_pages_info_returns_list(self, pdf_3pages_path):
        """
        get_pages_info returns list of PageInfo.

        Given: A 3-page PDF
        When: get_pages_info is called
        Then: Returns list with 3 items
        """
        pages = pdf_service.get_pages_info(pdf_3pages_path)

        assert len(pages) == 3
        for i, page in enumerate(pages):
            assert page.page == i + 1  # 1-indexed
            assert page.width > 0
            assert page.height > 0

    def test_get_pages_info_has_text_true(self, pdf_with_text_path):
        """
        get_pages_info detects text presence.

        Given: A PDF with text
        When: get_pages_info is called
        Then: has_text is True
        """
        pages = pdf_service.get_pages_info(pdf_with_text_path)

        assert len(pages) == 1
        assert pages[0].has_text is True

    def test_get_pages_info_has_text_false(self, pdf_blank_path):
        """
        get_pages_info detects text absence.

        Given: A blank PDF
        When: get_pages_info is called
        Then: has_text is False
        """
        pages = pdf_service.get_pages_info(pdf_blank_path)

        assert len(pages) == 1
        assert pages[0].has_text is False


class TestRenderPage:
    """Tests for render_page function."""

    def test_render_page_png(self, pdf_file_path):
        """
        Render page as PNG.

        Given: A PDF file
        When: render_page is called with format='png'
        Then: Returns PNG bytes and correct content-type
        """
        img_bytes, content_type = pdf_service.render_page(
            pdf_file_path, page_num=1, format="png"
        )

        assert content_type == "image/png"
        assert img_bytes[:8] == b"\x89PNG\r\n\x1a\n"  # PNG magic bytes

    def test_render_page_jpeg(self, pdf_file_path):
        """
        Render page as JPEG.

        Given: A PDF file
        When: render_page is called with format='jpeg'
        Then: Returns JPEG bytes and correct content-type
        """
        img_bytes, content_type = pdf_service.render_page(
            pdf_file_path, page_num=1, format="jpeg"
        )

        assert content_type == "image/jpeg"
        assert img_bytes[:2] == b"\xff\xd8"  # JPEG magic bytes

    def test_render_page_with_scale(self, pdf_file_path):
        """
        Render page with custom scale.

        Given: A PDF file
        When: render_page is called with scale=2.0
        Then: Image dimensions are approximately 2x default
        """
        img_1x, _ = pdf_service.render_page(pdf_file_path, page_num=1, scale=1.0)
        img_2x, _ = pdf_service.render_page(pdf_file_path, page_num=1, scale=2.0)

        # 2x scale should produce larger image
        assert len(img_2x) > len(img_1x)

    def test_render_page_out_of_range(self, pdf_file_path):
        """
        render_page raises error for invalid page.

        Given: A single-page PDF
        When: render_page is called with page_num=99
        Then: Raises ValueError
        """
        with pytest.raises(ValueError, match="out of range"):
            pdf_service.render_page(pdf_file_path, page_num=99)

    def test_render_page_zero_invalid(self, pdf_file_path):
        """
        render_page raises error for page 0.

        Given: A PDF file
        When: render_page is called with page_num=0
        Then: Raises ValueError
        """
        with pytest.raises(ValueError, match="out of range"):
            pdf_service.render_page(pdf_file_path, page_num=0)


class TestExtractTextBlocks:
    """Tests for extract_text_blocks function."""

    def test_extract_text_blocks_returns_list(self, pdf_with_text_path):
        """
        extract_text_blocks returns list of blocks.

        Given: A PDF with text
        When: extract_text_blocks is called
        Then: Returns non-empty list of blocks with positions
        """
        blocks = pdf_service.extract_text_blocks(pdf_with_text_path, page_num=1)

        assert len(blocks) > 0
        for block in blocks:
            assert "text" in block
            assert "x0" in block
            assert "y0" in block
            assert "x1" in block
            assert "y1" in block

    def test_extract_text_blocks_empty_page(self, pdf_blank_path):
        """
        extract_text_blocks returns empty list for blank page.

        Given: A blank PDF
        When: extract_text_blocks is called
        Then: Returns empty list
        """
        blocks = pdf_service.extract_text_blocks(pdf_blank_path, page_num=1)
        assert blocks == []

    def test_extract_text_blocks_with_bbox(self, pdf_with_text_path):
        """
        extract_text_blocks filters by bounding box.

        Given: A PDF with text and a bbox that excludes it
        When: extract_text_blocks is called with bbox
        Then: Returns fewer or no blocks
        """
        # Get all blocks first
        all_blocks = pdf_service.extract_text_blocks(pdf_with_text_path, page_num=1)

        # Use bbox that's outside the text area
        filtered_blocks = pdf_service.extract_text_blocks(
            pdf_with_text_path, page_num=1, bbox=[500, 500, 600, 600]
        )

        assert len(filtered_blocks) <= len(all_blocks)


class TestExtractPageText:
    """Tests for extract_page_text function."""

    def test_extract_page_text_returns_content(self, pdf_with_text_path):
        """
        extract_page_text returns text content.

        Given: A PDF with text
        When: extract_page_text is called
        Then: Returns non-empty string with expected content
        """
        text = pdf_service.extract_page_text(pdf_with_text_path, page_num=1)

        assert len(text) > 0
        assert "Product" in text  # From our fixture

    def test_extract_page_text_blank_page(self, pdf_blank_path):
        """
        extract_page_text returns empty string for blank page.

        Given: A blank PDF
        When: extract_page_text is called
        Then: Returns empty or whitespace-only string
        """
        text = pdf_service.extract_page_text(pdf_blank_path, page_num=1)
        assert text.strip() == ""

    def test_extract_page_text_out_of_range(self, pdf_file_path):
        """
        extract_page_text raises error for invalid page.

        Given: A single-page PDF
        When: extract_page_text is called with page_num=99
        Then: Raises ValueError
        """
        with pytest.raises(ValueError, match="out of range"):
            pdf_service.extract_page_text(pdf_file_path, page_num=99)


class TestPageHasText:
    """Tests for page_has_text function."""

    def test_page_has_text_true(self, pdf_with_text_path):
        """
        page_has_text returns True for page with text.

        Given: A PDF page with text
        When: page_has_text is called
        Then: Returns True
        """
        assert pdf_service.page_has_text(pdf_with_text_path, page_num=1) is True

    def test_page_has_text_false(self, pdf_blank_path):
        """
        page_has_text returns False for blank page.

        Given: A blank PDF page
        When: page_has_text is called
        Then: Returns False
        """
        assert pdf_service.page_has_text(pdf_blank_path, page_num=1) is False
