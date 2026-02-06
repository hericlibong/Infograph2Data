"""
Integration tests for review endpoints (/datasets).

This module tests:
- GET /datasets/{id} (get dataset)
- GET /datasets (list datasets)
- PUT /datasets/{id} (update dataset)
- Edit history tracking

Fixtures required:
- client: FastAPI TestClient with temp storage
- extracted_dataset: Pre-extracted dataset

Not tested here:
- Extractor internals (see unit/test_extractor.py)
"""


class TestGetDataset:
    """Tests for GET /datasets/{id} endpoint."""

    def test_get_dataset(self, client, extracted_dataset):
        """
        Get extracted dataset.

        Given: A dataset has been extracted
        When: GET /datasets/{id}
        Then: Returns 200 with columns, rows, metadata
        """
        dataset_id = extracted_dataset["dataset_id"]

        response = client.get(f"/datasets/{dataset_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == dataset_id
        assert "columns" in data
        assert "rows" in data
        assert len(data["columns"]) > 0
        assert len(data["rows"]) > 0
        assert "strategy_used" in data
        assert "created_at" in data
        assert "edit_history" in data

    def test_get_dataset_not_found(self, client):
        """
        Return 404 for non-existent dataset.

        Given: A non-existent dataset_id
        When: GET /datasets/{id}
        Then: Returns 404
        """
        response = client.get("/datasets/nonexistent-id")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestListDatasets:
    """Tests for GET /datasets endpoint."""

    def test_list_datasets_empty(self, client):
        """
        List datasets when none exist.

        Given: No datasets have been created
        When: GET /datasets
        Then: Returns 200 with empty list
        """
        response = client.get("/datasets")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_datasets_multiple(self, client, uploaded_table_pdf, sample_pdf_with_text):
        """
        List multiple datasets.

        Given: Multiple extractions have been performed
        When: GET /datasets
        Then: Returns all datasets
        """
        import io

        # First extraction
        client.post("/extract", json={"file_id": uploaded_table_pdf, "page": 1})

        # Upload and extract another
        resp = client.post(
            "/files",
            files={"file": ("another.pdf", io.BytesIO(sample_pdf_with_text), "application/pdf")},
        )
        file_id = resp.json()["id"]
        client.post("/extract", json={"file_id": file_id, "page": 1})

        response = client.get("/datasets")

        assert response.status_code == 200
        datasets = response.json()
        assert len(datasets) == 2


class TestUpdateDataset:
    """Tests for PUT /datasets/{id} endpoint."""

    def test_update_dataset_rows(self, client, extracted_dataset):
        """
        Update dataset rows.

        Given: A dataset exists
        When: PUT /datasets/{id} with updated rows
        Then: Returns 200 with updated rows and edit_history
        """
        dataset_id = extracted_dataset["dataset_id"]

        # Get original dataset
        original = client.get(f"/datasets/{dataset_id}").json()

        # Update with modified price
        updated_rows = [
            {"row_id": 1, "Product": "Apple", "Price": "1.99", "Quantity": "100"},
            {"row_id": 2, "Product": "Banana", "Price": "0.85", "Quantity": "200"},
        ]

        response = client.put(
            f"/datasets/{dataset_id}",
            json={"rows": updated_rows},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["rows"]) == 2
        assert data["rows"][0]["Price"] == "1.99"
        assert len(data["edit_history"]) == 1
        assert data["edit_history"][0]["action"] == "update"

    def test_update_dataset_columns(self, client, extracted_dataset):
        """
        Update dataset columns.

        Given: A dataset exists
        When: PUT /datasets/{id} with new columns
        Then: Returns 200 with updated columns and history tracks changes
        """
        dataset_id = extracted_dataset["dataset_id"]

        # Add a new column
        response = client.put(
            f"/datasets/{dataset_id}",
            json={"columns": ["Product", "Price", "Quantity", "InStock"]},
        )

        assert response.status_code == 200
        data = response.json()
        assert "InStock" in data["columns"]
        assert len(data["edit_history"]) >= 1

        # Check history tracks the column addition
        last_edit = data["edit_history"][-1]
        assert "InStock" in last_edit["changes"].get("columns_added", [])

    def test_update_dataset_not_found(self, client):
        """
        Return 404 for non-existent dataset.

        Given: A non-existent dataset_id
        When: PUT /datasets/{id}
        Then: Returns 404
        """
        response = client.put(
            "/datasets/nonexistent-id",
            json={"rows": []},
        )

        assert response.status_code == 404

    def test_edit_history_appends(self, client, extracted_dataset):
        """
        Multiple edits append to history.

        Given: A dataset exists
        When: PUT /datasets/{id} is called twice
        Then: edit_history has 2 entries
        """
        dataset_id = extracted_dataset["dataset_id"]

        # First edit
        client.put(
            f"/datasets/{dataset_id}",
            json={"rows": [{"row_id": 1, "Product": "Apple", "Price": "1.50", "Quantity": "100"}]},
        )

        # Second edit
        client.put(
            f"/datasets/{dataset_id}",
            json={"rows": [{"row_id": 1, "Product": "Apple", "Price": "1.75", "Quantity": "100"}]},
        )

        response = client.get(f"/datasets/{dataset_id}")
        data = response.json()

        assert len(data["edit_history"]) == 2
