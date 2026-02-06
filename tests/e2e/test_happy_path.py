"""
End-to-end happy path test.

This module tests:
- Complete workflow: Upload → Extract → Edit → Export

Fixtures required:
- client: FastAPI TestClient with temp storage
- table_pdf_bytes: PDF with well-structured table

This is the single comprehensive E2E test that proves
the entire backend works together.
"""

import csv
import io
import json
import zipfile


class TestEndToEndHappyPath:
    """End-to-end workflow test."""

    def test_e2e_upload_extract_edit_export(self, client, table_pdf_bytes):
        """
        Complete workflow: Upload → Get Pages → Extract → Edit → Export.

        Given: A PDF with structured table data
        When: The complete workflow is executed
        Then: Each step succeeds and final export contains edited data

        Proves: The entire backend pipeline works end-to-end.
        """
        # =====================================================================
        # Step 1: Upload PDF
        # =====================================================================
        upload_response = client.post(
            "/files",
            files={"file": ("data.pdf", io.BytesIO(table_pdf_bytes), "application/pdf")},
        )

        assert upload_response.status_code == 201, "Upload should succeed"
        file_data = upload_response.json()
        file_id = file_data["id"]
        assert file_data["pages"] == 1
        assert file_data["mime_type"] == "application/pdf"

        # =====================================================================
        # Step 2: Get Pages Info
        # =====================================================================
        pages_response = client.get(f"/files/{file_id}/pages")

        assert pages_response.status_code == 200, "Get pages should succeed"
        pages_data = pages_response.json()
        assert pages_data["total_pages"] == 1
        assert pages_data["pages"][0]["has_text"] is True

        # =====================================================================
        # Step 3: Preview Page (verify rendering works)
        # =====================================================================
        preview_response = client.get(f"/files/{file_id}/pages/1/preview?scale=1.5")

        assert preview_response.status_code == 200, "Preview should succeed"
        assert preview_response.headers["content-type"] == "image/png"
        assert len(preview_response.content) > 100  # Non-trivial image

        # =====================================================================
        # Step 4: Extract Data
        # =====================================================================
        extract_response = client.post(
            "/extract",
            json={"file_id": file_id, "page": 1},
        )

        assert extract_response.status_code == 202, "Extract should succeed"
        extract_data = extract_response.json()
        job_id = extract_data["job_id"]
        dataset_id = extract_data["dataset_id"]
        assert extract_data["status"] == "completed"

        # =====================================================================
        # Step 5: Verify Job Status
        # =====================================================================
        job_response = client.get(f"/jobs/{job_id}")

        assert job_response.status_code == 200, "Get job should succeed"
        job_data = job_response.json()
        assert job_data["status"] == "completed"
        assert job_data["strategy_used"] == "pdf_text"
        assert len(job_data["logs"]) > 0

        # =====================================================================
        # Step 6: Get Dataset for Review
        # =====================================================================
        dataset_response = client.get(f"/datasets/{dataset_id}")

        assert dataset_response.status_code == 200, "Get dataset should succeed"
        dataset_data = dataset_response.json()
        assert len(dataset_data["columns"]) >= 3  # Name, Age, City
        assert len(dataset_data["rows"]) >= 3  # Alice, Bob, Charlie
        original_rows = dataset_data["rows"]

        # =====================================================================
        # Step 7: Edit Dataset (modify a value)
        # =====================================================================
        edited_rows = []
        for row in original_rows:
            new_row = row.copy()
            if new_row.get("Name") == "Alice":
                new_row["Age"] = "31"  # Birthday!
            edited_rows.append(new_row)

        edit_response = client.put(
            f"/datasets/{dataset_id}",
            json={"rows": edited_rows},
        )

        assert edit_response.status_code == 200, "Edit should succeed"
        edit_data = edit_response.json()
        assert len(edit_data["edit_history"]) == 1
        assert edit_data["edit_history"][0]["action"] == "update"

        # Verify the edit persisted
        verify_response = client.get(f"/datasets/{dataset_id}")
        verify_data = verify_response.json()
        alice_row = next((r for r in verify_data["rows"] if r.get("Name") == "Alice"), None)
        assert alice_row is not None
        assert alice_row["Age"] == "31"

        # =====================================================================
        # Step 8: Export Dataset
        # =====================================================================
        export_response = client.get(f"/export/{dataset_id}")

        assert export_response.status_code == 200, "Export should succeed"
        assert export_response.headers["content-type"] == "application/zip"

        # =====================================================================
        # Step 9: Verify Export Contents
        # =====================================================================
        with zipfile.ZipFile(io.BytesIO(export_response.content)) as zf:
            names = zf.namelist()
            assert "data.csv" in names
            assert "data.json" in names
            assert "manifest.json" in names

            # Verify CSV contains edited data
            csv_content = zf.read("data.csv").decode("utf-8")
            assert "31" in csv_content  # Alice's new age

            # Verify JSON contains edited data
            json_content = zf.read("data.json").decode("utf-8")
            json_data = json.loads(json_content)
            alice_json = next((r for r in json_data if r.get("Name") == "Alice"), None)
            assert alice_json is not None
            assert alice_json["Age"] == "31"

            # Verify manifest has provenance
            manifest_content = zf.read("manifest.json").decode("utf-8")
            manifest = json.loads(manifest_content)
            assert manifest["dataset_id"] == dataset_id
            assert manifest["source"]["file_id"] == file_id
            assert manifest["extraction"]["strategy"] == "pdf_text"
            assert manifest["edits"]["total_edits"] == 1
            assert manifest["data"]["row_count"] >= 3

        # =====================================================================
        # Success! Complete workflow verified.
        # =====================================================================
