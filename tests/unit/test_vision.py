"""
Unit tests for Vision LLM service.

Tests the vision service with mocked OpenAI API calls.
No actual API calls are made - all responses are mocked.
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from backend.app.schemas.identification import (
    BoundingBox,
    DetectedItem,
    ElementType,
    ImageDimensions,
    ItemSelection,
    StoredIdentification,
)
from backend.app.services import vision


class TestIsVisionConfigured:
    """Tests for is_vision_configured function."""

    def test_configured_with_valid_key(self):
        """Given a valid API key, should return True."""
        with patch.object(vision.settings, "openai_api_key", "sk-valid-key-12345"):
            assert vision.is_vision_configured() is True

    def test_not_configured_with_none(self):
        """Given None API key, should return False."""
        with patch.object(vision.settings, "openai_api_key", None):
            assert vision.is_vision_configured() is False

    def test_not_configured_with_short_key(self):
        """Given a too-short API key, should return False."""
        with patch.object(vision.settings, "openai_api_key", "short"):
            assert vision.is_vision_configured() is False


class TestGetImageMimeType:
    """Tests for get_image_mime_type function."""

    def test_png_file(self):
        """Given a PNG path, should return image/png."""
        assert vision.get_image_mime_type(Path("image.png")) == "image/png"

    def test_jpg_file(self):
        """Given a JPG path, should return image/jpeg."""
        assert vision.get_image_mime_type(Path("image.jpg")) == "image/jpeg"

    def test_jpeg_file(self):
        """Given a JPEG path, should return image/jpeg."""
        assert vision.get_image_mime_type(Path("image.jpeg")) == "image/jpeg"

    def test_webp_file(self):
        """Given a WebP path, should return image/webp."""
        assert vision.get_image_mime_type(Path("image.webp")) == "image/webp"

    def test_unknown_defaults_to_png(self):
        """Given an unknown extension, should default to image/png."""
        assert vision.get_image_mime_type(Path("image.unknown")) == "image/png"


class TestEncodeImageBase64:
    """Tests for encode_image_base64 function."""

    def test_encodes_file_correctly(self, tmp_path):
        """Given an image file, should encode to base64."""
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake image content")

        result = vision.encode_image_base64(image_path)

        assert isinstance(result, str)
        assert len(result) > 0
        # Verify it's valid base64
        import base64
        decoded = base64.b64decode(result)
        assert decoded == b"fake image content"


class TestIdentifyElements:
    """Tests for identify_elements function."""

    @pytest.fixture
    def mock_openai_response(self):
        """Create a mock OpenAI response for identification."""
        return {
            "detected_items": [
                {
                    "type": "bar_chart",
                    "title": "Sales by Region",
                    "description": "Bar chart showing sales figures",
                    "data_preview": "5 categories",
                    "bbox": {"x": 100, "y": 50, "width": 400, "height": 300},
                    "confidence": 0.95,
                    "warnings": [],
                },
                {
                    "type": "kpi_panel",
                    "title": "Key Metrics",
                    "description": "KPIs showing totals",
                    "data_preview": "3 values",
                    "bbox": {"x": 10, "y": 10, "width": 200, "height": 100},
                    "confidence": 0.88,
                    "warnings": ["Some values may be approximate"],
                },
            ],
            "image_width": 1000,
            "image_height": 800,
        }

    def test_identify_elements_success(self, tmp_path, mock_openai_response):
        """Given a valid image, should return detected items."""
        # Create a test image
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake image content")

        # Mock OpenAI client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_openai_response)

        with patch.object(vision.settings, "openai_api_key", "sk-test-key-12345"):
            with patch.object(vision, "get_openai_client") as mock_client:
                mock_client.return_value.chat.completions.create.return_value = mock_response

                items, dimensions = asyncio.run(vision.identify_elements(image_path))

        assert len(items) == 2
        assert items[0].type == ElementType.BAR_CHART
        assert items[0].title == "Sales by Region"
        assert items[0].confidence == 0.95
        assert items[1].type == ElementType.KPI_PANEL
        assert dimensions.width == 1000
        assert dimensions.height == 800

    def test_identify_raises_when_not_configured(self, tmp_path):
        """Given no API key, should raise RuntimeError."""
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake image")

        with patch.object(vision.settings, "openai_api_key", None):
            with pytest.raises(RuntimeError, match="not configured"):
                asyncio.run(vision.identify_elements(image_path))


class TestExtractData:
    """Tests for extract_data function."""

    @pytest.fixture
    def mock_extraction_response(self):
        """Create a mock OpenAI response for extraction."""
        return {
            "extractions": [
                {
                    "item_id": "item-1",
                    "title": "Sales by Region",
                    "columns": ["Region", "Sales"],
                    "rows": [
                        {"Region": "North", "Sales": 1000},
                        {"Region": "South", "Sales": 800},
                    ],
                    "confidence": 0.92,
                    "notes": None,
                }
            ]
        }

    @pytest.fixture
    def sample_stored_items(self):
        """Create sample stored items for testing."""
        return [
            DetectedItem(
                item_id="item-1",
                type=ElementType.BAR_CHART,
                title="Sales by Region",
                description="Bar chart",
                data_preview="5 categories",
                bbox=BoundingBox(x=100, y=50, width=400, height=300),
                confidence=0.95,
                warnings=[],
            )
        ]

    def test_extract_data_success(self, tmp_path, mock_extraction_response, sample_stored_items):
        """Given valid items, should extract structured data."""
        image_path = tmp_path / "test.png"
        image_path.write_bytes(b"fake image content")

        items = [ItemSelection(item_id="item-1")]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_extraction_response)

        with patch.object(vision.settings, "openai_api_key", "sk-test-key-12345"):
            with patch.object(vision, "get_openai_client") as mock_client:
                mock_client.return_value.chat.completions.create.return_value = mock_response

                datasets = asyncio.run(
                    vision.extract_data(image_path, items, sample_stored_items, {})
                )

        assert len(datasets) == 1
        assert datasets[0].title == "Sales by Region"
        assert datasets[0].columns == ["Region", "Sales"]
        assert len(datasets[0].rows) == 2
        assert datasets[0].rows[0]["Region"] == "North"


class TestMergeDatasets:
    """Tests for _merge_datasets function."""

    def test_merge_two_datasets(self):
        """Given two datasets, should merge them correctly."""
        from backend.app.schemas.identification import ExtractedDataset, ExtractionMetadata

        ds1 = ExtractedDataset(
            dataset_id="ds-1",
            source_item_id="item-1",
            title="Dataset 1",
            type=ElementType.BAR_CHART,
            columns=["A", "B"],
            rows=[{"row_id": "r1", "A": 1, "B": 2}],
            metadata=ExtractionMetadata(extraction_confidence=0.9),
        )
        ds2 = ExtractedDataset(
            dataset_id="ds-2",
            source_item_id="item-2",
            title="Dataset 2",
            type=ElementType.PIE_CHART,
            columns=["C", "D"],
            rows=[{"row_id": "r1", "C": 3, "D": 4}],
            metadata=ExtractionMetadata(extraction_confidence=0.8),
        )

        merged = vision._merge_datasets([ds1, ds2])

        assert merged.title == "Merged extraction"
        assert "Source" in merged.columns
        assert "Category" in merged.columns
        assert len(merged.rows) == 2


class TestStorageOperations:
    """Tests for identification storage functions."""

    def test_create_identification_id(self):
        """Should create a unique identification ID."""
        id1 = vision.create_identification_id()
        id2 = vision.create_identification_id()

        assert id1.startswith("ident-")
        assert id2.startswith("ident-")
        assert id1 != id2

    def test_get_identification_expiry(self):
        """Should return a future datetime."""
        expiry = vision.get_identification_expiry()
        assert expiry > datetime.now(timezone.utc)

    def test_save_and_load_identification(self, tmp_path):
        """Should save and load identification correctly."""
        with patch.object(vision.settings, "storage_dir", str(tmp_path)):
            stored = StoredIdentification(
                identification_id="ident-test123",
                file_id="file-abc",
                page=1,
                image_dimensions=ImageDimensions(width=800, height=600),
                detected_items=[],
                image_path="/tmp/test.png",
                status="awaiting_confirmation",
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )

            vision.save_identification(stored)
            loaded = vision.load_identification("ident-test123")

            assert loaded is not None
            assert loaded.identification_id == "ident-test123"
            assert loaded.file_id == "file-abc"
            assert loaded.page == 1

    def test_load_nonexistent_identification(self, tmp_path):
        """Should return None for nonexistent identification."""
        with patch.object(vision.settings, "storage_dir", str(tmp_path)):
            loaded = vision.load_identification("nonexistent")
            assert loaded is None
