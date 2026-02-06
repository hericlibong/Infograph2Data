"""
Shared test fixtures for Infograph2Data backend tests.

This module provides:
- FastAPI TestClient fixture
- Temporary storage directory override
- Sample PDF/image file fixtures
- Composite fixtures for pre-uploaded files and datasets

All fixtures that touch storage use temp directories for isolation.
"""

import io
from typing import Generator

import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.main import app


# =============================================================================
# Core Fixtures
# =============================================================================


@pytest.fixture
def temp_storage(tmp_path, monkeypatch) -> Generator:
    """
    Override storage directory for test isolation.

    Given: A test needs filesystem storage
    When: This fixture is used
    Then: All storage operations use a temp directory that is auto-cleaned
    """
    storage_path = tmp_path / "storage"
    storage_path.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "storage_dir", str(storage_path))
    yield storage_path


@pytest.fixture
def client(temp_storage) -> Generator[TestClient, None, None]:
    """
    FastAPI TestClient with isolated storage.

    Given: A test needs to make HTTP requests to the API
    When: This fixture is used
    Then: Requests are handled by the app with temp storage
    """
    with TestClient(app) as c:
        yield c


# =============================================================================
# Sample File Fixtures (Session-scoped for performance)
# =============================================================================


@pytest.fixture(scope="session")
def sample_pdf() -> bytes:
    """
    Minimal single-page PDF for basic upload tests.

    Returns: PDF bytes with one blank page
    """
    doc = fitz.open()
    doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(scope="session")
def sample_pdf_3pages() -> bytes:
    """
    3-page PDF for page counting tests.

    Returns: PDF bytes with 3 pages, each labeled
    """
    doc = fitz.open()
    for i in range(3):
        page = doc.new_page()
        page.insert_text((50, 50), f"Page {i + 1}")
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(scope="session")
def sample_pdf_with_text() -> bytes:
    """
    PDF with extractable table text for extraction tests.

    Returns: PDF bytes with tab-delimited table data
    """
    doc = fitz.open()
    page = doc.new_page()
    table_text = "Product\tPrice\tQuantity\nApple\t1.50\t100\nBanana\t0.75\t200"
    page.insert_text((50, 50), table_text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(scope="session")
def sample_pdf_blank() -> bytes:
    """
    PDF with no text layer for needs_ocr tests.

    Returns: PDF bytes with blank page (no text)
    """
    doc = fitz.open()
    doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(scope="session")
def sample_png() -> bytes:
    """
    Minimal valid PNG image.

    Returns: 1x1 white PNG bytes
    """
    # Minimal 1x1 white PNG (hand-crafted bytes)
    return bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82,
    ])


@pytest.fixture(scope="session")
def sample_jpeg() -> bytes:
    """
    Minimal valid JPEG image.

    Returns: 1x1 white JPEG bytes
    """
    # Minimal 1x1 JPEG
    return bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
        0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
        0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
        0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
        0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF,
        0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04,
        0x00, 0x00, 0x01, 0x7D, 0x01, 0x02, 0x03, 0x00,
        0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
        0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1,
        0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A,
        0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35,
        0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55,
        0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65,
        0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85,
        0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94,
        0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2,
        0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA,
        0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8,
        0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6,
        0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA,
        0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
        0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x45, 0xFF,
        0xD9,
    ])


@pytest.fixture(scope="session")
def table_pdf_bytes() -> bytes:
    """
    PDF with well-structured table for E2E tests.

    Returns: PDF bytes with a 3-row, 3-column table
    """
    doc = fitz.open()
    page = doc.new_page()
    table_text = "Name\tAge\tCity\nAlice\t30\tNew York\nBob\t25\tLos Angeles\nCharlie\t35\tChicago"
    page.insert_text((50, 50), table_text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# =============================================================================
# Composite Fixtures (require temp_storage + client)
# =============================================================================


@pytest.fixture
def uploaded_pdf(client, sample_pdf) -> str:
    """
    Pre-uploaded PDF file.

    Given: Need a file_id for subsequent operations
    When: This fixture is used
    Then: Returns file_id of an uploaded PDF

    Returns: file_id string
    """
    response = client.post(
        "/files",
        files={"file": ("test.pdf", io.BytesIO(sample_pdf), "application/pdf")},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
def uploaded_pdf_3pages(client, sample_pdf_3pages) -> str:
    """Pre-uploaded 3-page PDF. Returns file_id."""
    response = client.post(
        "/files",
        files={"file": ("test_3pages.pdf", io.BytesIO(sample_pdf_3pages), "application/pdf")},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
def uploaded_table_pdf(client, sample_pdf_with_text) -> str:
    """Pre-uploaded PDF with table text. Returns file_id."""
    response = client.post(
        "/files",
        files={"file": ("table.pdf", io.BytesIO(sample_pdf_with_text), "application/pdf")},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
def uploaded_blank_pdf(client, sample_pdf_blank) -> str:
    """Pre-uploaded blank PDF (no text). Returns file_id."""
    response = client.post(
        "/files",
        files={"file": ("blank.pdf", io.BytesIO(sample_pdf_blank), "application/pdf")},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
def uploaded_png(client, sample_png) -> str:
    """Pre-uploaded PNG image. Returns file_id."""
    response = client.post(
        "/files",
        files={"file": ("test.png", io.BytesIO(sample_png), "image/png")},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
def extracted_dataset(client, uploaded_table_pdf) -> dict:
    """
    Pre-extracted dataset from table PDF.

    Returns: dict with dataset_id, job_id, file_id
    """
    response = client.post(
        "/extract",
        json={"file_id": uploaded_table_pdf, "page": 1},
    )
    assert response.status_code == 202
    data = response.json()
    return {
        "dataset_id": data["dataset_id"],
        "job_id": data["job_id"],
        "file_id": uploaded_table_pdf,
    }


@pytest.fixture
def edited_dataset(client, extracted_dataset) -> dict:
    """
    Dataset with one edit applied.

    Returns: dict with dataset_id, job_id, file_id
    """
    dataset_id = extracted_dataset["dataset_id"]

    # Apply an edit
    response = client.put(
        f"/datasets/{dataset_id}",
        json={
            "rows": [
                {"row_id": 1, "Product": "Apple", "Price": "1.99", "Quantity": "100"},
                {"row_id": 2, "Product": "Banana", "Price": "0.75", "Quantity": "200"},
            ]
        },
    )
    assert response.status_code == 200

    return extracted_dataset
