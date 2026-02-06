"""
Integration tests for upload endpoints (/files).

This module tests:
- POST /files (upload)
- GET /files/{id} (metadata)
- GET /files (list)
- Error handling for invalid uploads

Fixtures required:
- client: FastAPI TestClient with temp storage
- sample_pdf, sample_png, sample_jpeg: Sample file bytes

Not tested here:
- Storage internals (see unit/test_storage.py)
"""

import io


class TestUploadFile:
    """Tests for POST /files endpoint."""

    def test_upload_pdf_success(self, client, sample_pdf):
        """
        Upload a valid PDF file successfully.

        Given: A valid single-page PDF file
        When: POST /files with the PDF as multipart form data
        Then: Returns 201 with file metadata including pages=1

        Proves: Basic upload flow works, PDF page counting works.
        """
        response = client.post(
            "/files",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf), "application/pdf")},
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["filename"] == "test.pdf"
        assert data["mime_type"] == "application/pdf"
        assert data["pages"] == 1
        assert data["size_bytes"] == len(sample_pdf)
        assert "created_at" in data

    def test_upload_pdf_3pages(self, client, sample_pdf_3pages):
        """
        Upload multi-page PDF reports correct page count.

        Given: A 3-page PDF
        When: POST /files
        Then: Returns pages=3
        """
        response = client.post(
            "/files",
            files={"file": ("multi.pdf", io.BytesIO(sample_pdf_3pages), "application/pdf")},
        )

        assert response.status_code == 201
        assert response.json()["pages"] == 3

    def test_upload_png_success(self, client, sample_png):
        """
        Upload PNG image successfully.

        Given: A valid PNG image
        When: POST /files
        Then: Returns 201 with pages=None (images have no pages)
        """
        response = client.post(
            "/files",
            files={"file": ("image.png", io.BytesIO(sample_png), "image/png")},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["mime_type"] == "image/png"
        assert data["pages"] is None

    def test_upload_jpeg_success(self, client, sample_jpeg):
        """
        Upload JPEG image successfully.

        Given: A valid JPEG image
        When: POST /files
        Then: Returns 201
        """
        response = client.post(
            "/files",
            files={"file": ("photo.jpg", io.BytesIO(sample_jpeg), "image/jpeg")},
        )

        assert response.status_code == 201
        assert response.json()["mime_type"] == "image/jpeg"

    def test_upload_invalid_mime_type(self, client):
        """
        Reject upload with unsupported MIME type.

        Given: A text file
        When: POST /files
        Then: Returns 400 with error message
        """
        response = client.post(
            "/files",
            files={"file": ("readme.txt", io.BytesIO(b"hello"), "text/plain")},
        )

        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]


class TestGetFileMetadata:
    """Tests for GET /files/{id} endpoint."""

    def test_get_file_metadata(self, client, uploaded_pdf):
        """
        Retrieve uploaded file metadata.

        Given: A file has been uploaded
        When: GET /files/{id}
        Then: Returns 200 with matching metadata
        """
        response = client.get(f"/files/{uploaded_pdf}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == uploaded_pdf
        assert data["filename"] == "test.pdf"
        assert data["mime_type"] == "application/pdf"

    def test_get_file_not_found(self, client):
        """
        Return 404 for non-existent file.

        Given: A non-existent file ID
        When: GET /files/{id}
        Then: Returns 404
        """
        response = client.get("/files/nonexistent-uuid")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestListFiles:
    """Tests for GET /files endpoint."""

    def test_list_files_empty(self, client):
        """
        List files when none uploaded.

        Given: No files have been uploaded
        When: GET /files
        Then: Returns 200 with empty list
        """
        response = client.get("/files")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_files_multiple(self, client, sample_pdf, sample_png):
        """
        List multiple uploaded files.

        Given: Multiple files have been uploaded
        When: GET /files
        Then: Returns all files, newest first
        """
        # Upload two files
        client.post(
            "/files",
            files={"file": ("first.pdf", io.BytesIO(sample_pdf), "application/pdf")},
        )
        client.post(
            "/files",
            files={"file": ("second.png", io.BytesIO(sample_png), "image/png")},
        )

        response = client.get("/files")

        assert response.status_code == 200
        files = response.json()
        assert len(files) == 2
        # Newest first
        assert files[0]["filename"] == "second.png"
        assert files[1]["filename"] == "first.pdf"
