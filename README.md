# Infograph2Data

Transform infographics, charts, and PDF pages into structured data (CSV/JSON) with human-in-the-loop review.

## Quick Start

```bash
# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -e .

# Run the backend server
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Verify it works
curl http://127.0.0.1:8001/health
# Expected: {"status":"healthy","version":"0.1.0"}
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://127.0.0.1:8001/docs
- ReDoc: http://127.0.0.1:8001/redoc

## Project Structure

See [docs/architecture.md](docs/architecture.md) for the full blueprint.

## Development Log

See [docs/devlog.md](docs/devlog.md) for chronological progress and commands.
