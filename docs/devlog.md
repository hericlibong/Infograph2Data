# Infograph2Data — Development Log

> Append-only. Never delete entries.

---

## [2026-02-05] Architecture Locked + Phase 1 Foundation

### Context
Initial project setup. Blueprint approved, now implementing runnable backend with health endpoint.

### Files Created
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI entrypoint
│   ├── config.py        # Settings with CORS origins
│   └── routers/
│       ├── __init__.py
│       └── health.py    # GET /health
docs/
├── architecture.md      # Full blueprint (locked)
└── devlog.md            # This file
.env.example             # Secret placeholders
.gitignore               # Ignore .venv, storage, exports, .env
pyproject.toml           # Dependencies
README.md                # Quick start guide
```

### Commands

```bash
# Activate virtual environment (already exists)
source .venv/bin/activate

# Install dependencies
pip install -e .

# Run the server (MUST use this exact command)
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Verify health endpoint (in another terminal)
curl http://127.0.0.1:8001/health
```

### Expected Output

Server startup:
```
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Health check response:
```json
{"status":"healthy","version":"0.1.0"}
```

### Decisions
- Chose Pydantic Settings for config (environment variable support, type safety).
- CORS configured for `http://localhost:5173` (Vite default) from the start.
- Health endpoint returns version for debugging deployments.

### Assumptions
- Python 3.12 is available in `.venv`.
- No database; filesystem storage under `backend/app/storage/` (gitignored).

### Next Steps
- [ ] Phase 2: Upload endpoint + file storage service
- [ ] Phase 2: Dataset model (in-memory)
