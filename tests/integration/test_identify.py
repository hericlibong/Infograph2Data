"""
Integration tests for Vision LLM identification endpoints.

Tests the /extract/identify and /extract/run endpoints with mocked Vision LLM.
"""

import io
import json
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.identification import (
    BoundingBox,
    DetectedItem,
    ElementType,
    ImageDimensions,
    StoredIdentification,
)
from backend.app.services import vision


class TestIdentifyEndpoint:
    """Tests for POST /extract/identify endpoint."""

    @pytest.fixture
    def mock_vision_response(self):
        """Create a mock OpenAI response for identification."""
        return {
            "detected_items": [
                {
                    "type": "bar_chart",
                    "title": "Test Chart",
                    "description": "A test bar chart",
                    "data_preview": "3 categories",
                    "bbox": {"x": 10, "y": 10, "width": 100, "height": 100},
                    "confidence": 0.9,
                    "warnings": [],
                }
            ],
            "image_width": 500,
            "image_height": 400,
        }

    def test_identify_returns_503_when_not_configured(self, client, temp_storage, sample_pdf):
        """Given no API key, should return 503."""
        # Upload a file first
        upload_resp = client.post(
            "/files",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf), "application/pdf")},
        )
        file_id = upload_resp.json()["id"]

        with patch.object(vision, "is_vision_configured", return_value=False):
            response = client.post(
                "/extract/identify",
                json={"file_id": file_id, "page": 1},
            )

        assert response.status_code == 503
        assert "not configured" in response.json()["detail"]

    def test_identify_returns_404_for_missing_file(self, client, temp_storage):
        """Given a nonexistent file_id, should return 404."""
        with patch.object(vision, "is_vision_configured", return_value=True):
            response = client.post(
                "/extract/identify",
                json={"file_id": "nonexistent", "page": 1},
            )

        assert response.status_code == 404

    def test_identify_requires_page_for_pdf(self, client, temp_storage, sample_pdf):
        """Given a PDF without page number, should return 400."""
        upload_resp = client.post(
            "/files",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf), "application/pdf")},
        )
        file_id = upload_resp.json()["id"]

        with patch.object(vision, "is_vision_configured", return_value=True):
            response = client.post(
                "/extract/identify",
                json={"file_id": file_id},  # No page
            )

        assert response.status_code == 400
        assert "Page number required" in response.json()["detail"]

    def test_identify_pdf_success(self, client, temp_storage, sample_pdf, mock_vision_response):
        """Given a valid PDF and page, should return detected items."""
        upload_resp = client.post(
            "/files",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf), "application/pdf")},
        )
        file_id = upload_resp.json()["id"]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_vision_response)

        with patch.object(vision.settings, "openai_api_key", "sk-test-key"):
            with patch.object(vision, "get_openai_client") as mock_client:
                mock_client.return_value.chat.completions.create.return_value = mock_response

                response = client.post(
                    "/extract/identify",
                    json={"file_id": file_id, "page": 1},
                )

        assert response.status_code == 200
        data = response.json()
        assert "identification_id" in data
        assert data["file_id"] == file_id
        assert data["page"] == 1
        assert len(data["detected_items"]) == 1
        assert data["detected_items"][0]["type"] == "bar_chart"
        assert data["status"] == "awaiting_confirmation"

    def test_identify_image_success(self, client, temp_storage, sample_png, mock_vision_response):
        """Given a valid image file, should return detected items."""
        upload_resp = client.post(
            "/files",
            files={"file": ("test.png", io.BytesIO(sample_png), "image/png")},
        )
        file_id = upload_resp.json()["id"]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_vision_response)

        with patch.object(vision.settings, "openai_api_key", "sk-test-key"):
            with patch.object(vision, "get_openai_client") as mock_client:
                mock_client.return_value.chat.completions.create.return_value = mock_response

                response = client.post(
                    "/extract/identify",
                    json={"file_id": file_id},  # No page needed for images
                )

        assert response.status_code == 200
        data = response.json()
        assert "identification_id" in data
        assert len(data["detected_items"]) == 1


class TestGetIdentificationEndpoint:
    """Tests for GET /extract/identify/{id} endpoint."""

    def test_get_identification_not_found(self, client, temp_storage):
        """Given a nonexistent ID, should return 404."""
        response = client.get("/extract/identify/nonexistent")
        assert response.status_code == 404

    def test_get_identification_success(self, client, temp_storage):
        """Given a valid ID, should return the identification."""
        # Create a stored identification
        stored = StoredIdentification(
            identification_id="ident-test123",
            file_id="file-abc",
            page=1,
            image_dimensions=ImageDimensions(width=800, height=600),
            detected_items=[
                DetectedItem(
                    item_id="item-1",
                    type=ElementType.BAR_CHART,
                    title="Test",
                    description="Test chart",
                    data_preview="3 items",
                    bbox=BoundingBox(x=0, y=0, width=100, height=100),
                    confidence=0.9,
                    warnings=[],
                )
            ],
            image_path="/tmp/test.png",
            status="awaiting_confirmation",
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        vision.save_identification(stored)

        response = client.get("/extract/identify/ident-test123")

        assert response.status_code == 200
        data = response.json()
        assert data["identification_id"] == "ident-test123"
        assert len(data["detected_items"]) == 1

    def test_get_identification_expired(self, client, temp_storage):
        """Given an expired identification, should return 410."""
        stored = StoredIdentification(
            identification_id="ident-expired",
            file_id="file-abc",
            page=1,
            image_dimensions=ImageDimensions(width=800, height=600),
            detected_items=[],
            image_path="/tmp/test.png",
            status="awaiting_confirmation",
            expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
        )
        vision.save_identification(stored)

        response = client.get("/extract/identify/ident-expired")

        assert response.status_code == 410
        assert "expired" in response.json()["detail"].lower()


class TestExtractRunEndpoint:
    """Tests for POST /extract/run endpoint."""

    @pytest.fixture
    def mock_extraction_response(self):
        """Create a mock OpenAI response for extraction."""
        return {
            "extractions": [
                {
                    "item_id": "item-1",
                    "title": "Test Chart",
                    "columns": ["Category", "Value"],
                    "rows": [
                        {"Category": "A", "Value": 10},
                        {"Category": "B", "Value": 20},
                    ],
                    "confidence": 0.9,
                    "notes": None,
                }
            ]
        }

    @pytest.fixture
    def stored_identification(self, temp_storage, tmp_path):
        """Create a stored identification for testing."""
        # Create a test image file
        image_path = tmp_path / "test_image.png"
        image_path.write_bytes(b"fake image content")

        stored = StoredIdentification(
            identification_id="ident-extract-test",
            file_id="file-abc",
            page=1,
            image_dimensions=ImageDimensions(width=800, height=600),
            detected_items=[
                DetectedItem(
                    item_id="item-1",
                    type=ElementType.BAR_CHART,
                    title="Test Chart",
                    description="A test chart",
                    data_preview="2 categories",
                    bbox=BoundingBox(x=0, y=0, width=100, height=100),
                    confidence=0.9,
                    warnings=[],
                )
            ],
            image_path=str(image_path),
            status="awaiting_confirmation",
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        vision.save_identification(stored)
        return stored

    def test_run_returns_503_when_not_configured(self, client, stored_identification):
        """Given no API key, should return 503."""
        with patch.object(vision, "is_vision_configured", return_value=False):
            response = client.post(
                "/extract/run",
                json={
                    "identification_id": "ident-extract-test",
                    "items": [{"item_id": "item-1"}],
                },
            )

        assert response.status_code == 503

    def test_run_returns_404_for_missing_identification(self, client, temp_storage):
        """Given a nonexistent identification_id, should return 404."""
        with patch.object(vision, "is_vision_configured", return_value=True):
            response = client.post(
                "/extract/run",
                json={
                    "identification_id": "nonexistent",
                    "items": [{"item_id": "item-1"}],
                },
            )

        assert response.status_code == 404

    def test_run_requires_bbox_for_new_items(self, client, stored_identification):
        """Given a new item without bbox, should return 400."""
        with patch.object(vision, "is_vision_configured", return_value=True):
            response = client.post(
                "/extract/run",
                json={
                    "identification_id": "ident-extract-test",
                    "items": [{"item_id": "new-1"}],  # No bbox
                },
            )

        assert response.status_code == 400
        assert "requires bbox" in response.json()["detail"]

    def test_run_extraction_success(self, client, stored_identification, mock_extraction_response):
        """Given valid items, should return extracted datasets."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_extraction_response)

        with patch.object(vision.settings, "openai_api_key", "sk-test-key"):
            with patch.object(vision, "get_openai_client") as mock_client:
                mock_client.return_value.chat.completions.create.return_value = mock_response

                response = client.post(
                    "/extract/run",
                    json={
                        "identification_id": "ident-extract-test",
                        "items": [{"item_id": "item-1"}],
                    },
                )

        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "completed"
        assert len(data["datasets"]) == 1
        assert data["datasets"][0]["title"] == "Test Chart"
        assert len(data["datasets"][0]["rows"]) == 2

    def test_run_with_item_override(self, client, stored_identification, mock_extraction_response):
        """Given items with overrides, should use overridden values."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_extraction_response)

        with patch.object(vision.settings, "openai_api_key", "sk-test-key"):
            with patch.object(vision, "get_openai_client") as mock_client:
                mock_client.return_value.chat.completions.create.return_value = mock_response

                response = client.post(
                    "/extract/run",
                    json={
                        "identification_id": "ident-extract-test",
                        "items": [
                            {
                                "item_id": "item-1",
                                "title": "Overridden Title",
                                "type": "pie_chart",
                            }
                        ],
                    },
                )

        assert response.status_code == 200

    def test_run_with_user_added_item(self, client, stored_identification, mock_extraction_response):
        """Given a user-added item with bbox, should include it."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        # Add extraction for new item
        extraction_with_new = {
            "extractions": [
                mock_extraction_response["extractions"][0],
                {
                    "item_id": "new-1",
                    "title": "User Added",
                    "columns": ["X"],
                    "rows": [{"X": 1}],
                    "confidence": 0.8,
                    "notes": None,
                },
            ]
        }
        mock_response.choices[0].message.content = json.dumps(extraction_with_new)

        with patch.object(vision.settings, "openai_api_key", "sk-test-key"):
            with patch.object(vision, "get_openai_client") as mock_client:
                mock_client.return_value.chat.completions.create.return_value = mock_response

                response = client.post(
                    "/extract/run",
                    json={
                        "identification_id": "ident-extract-test",
                        "items": [
                            {"item_id": "item-1"},
                            {
                                "item_id": "new-1",
                                "type": "table",
                                "title": "User Added",
                                "bbox": {"x": 200, "y": 200, "width": 50, "height": 50},
                            },
                        ],
                    },
                )

        assert response.status_code == 200
        assert len(response.json()["datasets"]) == 2
