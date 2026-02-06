"""
Integration tests for health endpoint.

This module tests:
- GET /health endpoint

Fixtures required:
- client: FastAPI TestClient with temp storage

Not tested here:
- Internal health check logic (trivial)
"""


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_returns_ok(self, client):
        """
        Health endpoint returns 200 with status info.

        Given: The API is running
        When: GET /health is requested
        Then: Returns 200 with status='healthy' and version

        Proves: Basic API is operational.
        """
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert data["version"] == "0.1.0"
