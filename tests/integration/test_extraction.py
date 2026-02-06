"""
Integration tests for extraction endpoints (/extract, /jobs, /files/{id}/pages).

This module tests:
- GET /files/{id}/pages (page info)
- GET /files/{id}/pages/{page}/preview (page rendering)
- POST /extract (start extraction job)
- GET /jobs/{job_id} (job status)

Fixtures required:
- client: FastAPI TestClient with temp storage
- uploaded_pdf, uploaded_table_pdf, uploaded_blank_pdf, uploaded_png

Not tested here:
- PDF internals (see unit/test_pdf.py)
- Extractor internals (see unit/test_extractor.py)
"""


class TestGetPagesInfo:
    """Tests for GET /files/{id}/pages endpoint."""

    def test_get_pages_info(self, client, uploaded_pdf_3pages):
        """
        Get page info for PDF.

        Given: A 3-page PDF has been uploaded
        When: GET /files/{id}/pages
        Then: Returns page info with dimensions and has_text
        """
        response = client.get(f"/files/{uploaded_pdf_3pages}/pages")

        assert response.status_code == 200
        data = response.json()
        assert data["file_id"] == uploaded_pdf_3pages
        assert data["total_pages"] == 3
        assert len(data["pages"]) == 3

        for i, page in enumerate(data["pages"]):
            assert page["page"] == i + 1  # 1-indexed
            assert "width" in page
            assert "height" in page
            assert "has_text" in page

    def test_get_pages_not_pdf(self, client, uploaded_png):
        """
        Reject pages request for non-PDF.

        Given: A PNG image has been uploaded
        When: GET /files/{id}/pages
        Then: Returns 400
        """
        response = client.get(f"/files/{uploaded_png}/pages")

        assert response.status_code == 400
        assert "not a PDF" in response.json()["detail"]

    def test_get_pages_not_found(self, client):
        """
        Return 404 for non-existent file.

        Given: A non-existent file ID
        When: GET /files/{id}/pages
        Then: Returns 404
        """
        response = client.get("/files/nonexistent-uuid/pages")

        assert response.status_code == 404


class TestPreviewPage:
    """Tests for GET /files/{id}/pages/{page}/preview endpoint."""

    def test_preview_page_png(self, client, uploaded_pdf):
        """
        Preview page as PNG.

        Given: A PDF has been uploaded
        When: GET /files/{id}/pages/1/preview
        Then: Returns PNG image bytes
        """
        response = client.get(f"/files/{uploaded_pdf}/pages/1/preview")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_preview_page_jpeg(self, client, uploaded_pdf):
        """
        Preview page as JPEG.

        Given: A PDF has been uploaded
        When: GET /files/{id}/pages/1/preview?format=jpeg
        Then: Returns JPEG image bytes
        """
        response = client.get(f"/files/{uploaded_pdf}/pages/1/preview?format=jpeg")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/jpeg"
        assert response.content[:2] == b"\xff\xd8"

    def test_preview_page_with_scale(self, client, uploaded_pdf):
        """
        Preview page with custom scale.

        Given: A PDF has been uploaded
        When: GET /files/{id}/pages/1/preview?scale=2
        Then: Returns larger image
        """
        resp_1x = client.get(f"/files/{uploaded_pdf}/pages/1/preview?scale=1")
        resp_2x = client.get(f"/files/{uploaded_pdf}/pages/1/preview?scale=2")

        assert resp_1x.status_code == 200
        assert resp_2x.status_code == 200
        # 2x should be larger
        assert len(resp_2x.content) > len(resp_1x.content)

    def test_preview_page_out_of_range(self, client, uploaded_pdf):
        """
        Return 400 for page out of range.

        Given: A single-page PDF
        When: GET /files/{id}/pages/99/preview
        Then: Returns 400
        """
        response = client.get(f"/files/{uploaded_pdf}/pages/99/preview")

        assert response.status_code == 400
        assert "out of range" in response.json()["detail"]

    def test_preview_not_pdf(self, client, uploaded_png):
        """
        Reject preview for non-PDF.

        Given: A PNG image
        When: GET /files/{id}/pages/1/preview
        Then: Returns 400
        """
        response = client.get(f"/files/{uploaded_png}/pages/1/preview")

        assert response.status_code == 400


class TestExtract:
    """Tests for POST /extract endpoint."""

    def test_extract_pdf_with_text(self, client, uploaded_table_pdf):
        """
        Extract from PDF with text layer.

        Given: A PDF with table text has been uploaded
        When: POST /extract with file_id and page
        Then: Returns 202 with job_id, dataset_id, status=completed
        """
        response = client.post(
            "/extract",
            json={"file_id": uploaded_table_pdf, "page": 1},
        )

        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert "dataset_id" in data
        assert data["status"] == "completed"

    def test_extract_pdf_no_text(self, client, uploaded_blank_pdf):
        """
        Extract from PDF without text layer.

        Given: A blank PDF (no text)
        When: POST /extract
        Then: Returns 202 with status=needs_ocr
        """
        response = client.post(
            "/extract",
            json={"file_id": uploaded_blank_pdf, "page": 1},
        )

        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "needs_ocr"

    def test_extract_file_not_found(self, client):
        """
        Return 404 for non-existent file.

        Given: A non-existent file_id
        When: POST /extract
        Then: Returns 404
        """
        response = client.post(
            "/extract",
            json={"file_id": "nonexistent-uuid", "page": 1},
        )

        assert response.status_code == 404

    def test_extract_page_out_of_range(self, client, uploaded_pdf):
        """
        Return 400 for page out of range.

        Given: A single-page PDF
        When: POST /extract with page=99
        Then: Returns 400
        """
        response = client.post(
            "/extract",
            json={"file_id": uploaded_pdf, "page": 99},
        )

        assert response.status_code == 400
        assert "out of range" in response.json()["detail"]


class TestGetJobStatus:
    """Tests for GET /jobs/{job_id} endpoint."""

    def test_get_job_status(self, client, extracted_dataset):
        """
        Get job status for completed extraction.

        Given: An extraction job has completed
        When: GET /jobs/{job_id}
        Then: Returns job with status, strategy_used, logs
        """
        job_id = extracted_dataset["job_id"]

        response = client.get(f"/jobs/{job_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == job_id
        assert data["status"] == "completed"
        assert data["strategy_used"] == "pdf_text"
        assert "logs" in data
        assert len(data["logs"]) > 0
        assert "created_at" in data
        assert "completed_at" in data

    def test_get_job_not_found(self, client):
        """
        Return 404 for non-existent job.

        Given: A non-existent job_id
        When: GET /jobs/{job_id}
        Then: Returns 404
        """
        response = client.get("/jobs/nonexistent-job")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
