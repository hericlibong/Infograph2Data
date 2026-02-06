"""
Integration tests for export endpoints (/export).

This module tests:
- GET /export/{id} (download ZIP)
- ZIP contents verification (CSV, JSON, manifest)
- Export after edits

Fixtures required:
- client: FastAPI TestClient with temp storage
- extracted_dataset, edited_dataset

Not tested here:
- CSV/JSON generation internals
"""

import csv
import io
import json
import zipfile


class TestExportDataset:
    """Tests for GET /export/{id} endpoint."""

    def test_export_zip_default(self, client, extracted_dataset):
        """
        Export dataset as ZIP with default formats.

        Given: A dataset has been extracted
        When: GET /export/{id}
        Then: Returns ZIP with data.csv, data.json, manifest.json
        """
        dataset_id = extracted_dataset["dataset_id"]

        response = client.get(f"/export/{dataset_id}")

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert f"{dataset_id}.zip" in response.headers["content-disposition"]

        # Verify ZIP contents
        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            names = zf.namelist()
            assert "data.csv" in names
            assert "data.json" in names
            assert "manifest.json" in names

    def test_export_zip_csv_only(self, client, extracted_dataset):
        """
        Export dataset with CSV format only.

        Given: A dataset exists
        When: GET /export/{id}?formats=csv
        Then: ZIP contains data.csv and manifest.json (no data.json)
        """
        dataset_id = extracted_dataset["dataset_id"]

        response = client.get(f"/export/{dataset_id}?formats=csv")

        assert response.status_code == 200

        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            names = zf.namelist()
            assert "data.csv" in names
            assert "manifest.json" in names
            assert "data.json" not in names

    def test_export_zip_json_only(self, client, extracted_dataset):
        """
        Export dataset with JSON format only.

        Given: A dataset exists
        When: GET /export/{id}?formats=json
        Then: ZIP contains data.json and manifest.json (no data.csv)
        """
        dataset_id = extracted_dataset["dataset_id"]

        response = client.get(f"/export/{dataset_id}?formats=json")

        assert response.status_code == 200

        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            names = zf.namelist()
            assert "data.json" in names
            assert "manifest.json" in names
            assert "data.csv" not in names

    def test_export_csv_content(self, client, extracted_dataset):
        """
        Verify CSV content is correctly formatted.

        Given: A dataset with known data
        When: GET /export/{id}
        Then: CSV has correct headers and rows
        """
        dataset_id = extracted_dataset["dataset_id"]

        response = client.get(f"/export/{dataset_id}")

        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            csv_content = zf.read("data.csv").decode("utf-8")

        # Parse CSV
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)

        assert len(rows) >= 2  # Header + at least 1 data row
        # First row is header
        assert "Product" in rows[0]

    def test_export_json_content(self, client, extracted_dataset):
        """
        Verify JSON content is correctly formatted.

        Given: A dataset with known data
        When: GET /export/{id}
        Then: JSON is array of objects without row_id
        """
        dataset_id = extracted_dataset["dataset_id"]

        response = client.get(f"/export/{dataset_id}")

        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            json_content = zf.read("data.json").decode("utf-8")

        data = json.loads(json_content)

        assert isinstance(data, list)
        assert len(data) >= 1
        # Should not contain row_id in export
        assert "row_id" not in data[0]
        assert "Product" in data[0]

    def test_export_manifest_provenance(self, client, extracted_dataset):
        """
        Verify manifest contains provenance information.

        Given: A dataset exists
        When: GET /export/{id}
        Then: manifest.json contains source, extraction, data info
        """
        dataset_id = extracted_dataset["dataset_id"]

        response = client.get(f"/export/{dataset_id}")

        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            manifest_content = zf.read("manifest.json").decode("utf-8")

        manifest = json.loads(manifest_content)

        assert manifest["dataset_id"] == dataset_id
        assert "exported_at" in manifest
        assert "source" in manifest
        assert "file_id" in manifest["source"]
        assert "extraction" in manifest
        assert "strategy" in manifest["extraction"]
        assert "data" in manifest
        assert "columns" in manifest["data"]
        assert "row_count" in manifest["data"]
        assert "edits" in manifest

    def test_export_not_found(self, client):
        """
        Return 404 for non-existent dataset.

        Given: A non-existent dataset_id
        When: GET /export/{id}
        Then: Returns 404
        """
        response = client.get("/export/nonexistent-id")

        assert response.status_code == 404

    def test_export_after_edit(self, client, edited_dataset):
        """
        Export reflects edits in manifest.

        Given: A dataset has been edited
        When: GET /export/{id}
        Then: manifest.edits shows edit history
        """
        dataset_id = edited_dataset["dataset_id"]

        response = client.get(f"/export/{dataset_id}")

        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            manifest_content = zf.read("manifest.json").decode("utf-8")

        manifest = json.loads(manifest_content)

        assert manifest["edits"]["total_edits"] >= 1
        assert manifest["edits"]["last_edited_at"] is not None
