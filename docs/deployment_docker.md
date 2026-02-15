# Docker deployment (Hugging Face Spaces)

This file documents the Docker multi-stage image used for deploying Infograph2Data on a single-port platform such as Hugging Face Spaces.

Overview

- Stage 1 (builder): Uses node:20-alpine to install frontend dependencies and run `npm run build` in `frontend/`.
- Stage 2 (runner): Uses python:3.11-slim, installs minimal system packages (libgl1, libglib2.0-0, poppler-utils), installs Python requirements from `requirements.txt`, copies `backend/`, `demo_assets/`, and the built `frontend/dist` directory from the builder stage, and starts the Uvicorn server.

Build & Run (local)

1. Build the Docker image from the repository root:

```bash
docker build -t infograph2data:latest .
```

2. Run the container:

```bash
docker run -p 7860:7860 infograph2data:latest
```

Notes for Hugging Face Spaces

- Hugging Face Spaces exposes a single port (7860 commonly used). The Dockerfile exposes 7860 and runs Uvicorn on that port.
- Ensure `requirements.txt` is up-to-date before building the image (created via `pip freeze` during ops). If you rebuild the image locally, re-run `pip freeze > requirements.txt` from the appropriate virtualenv.
- The frontend is built inside the Docker builder stage; the final image contains `/app/frontend/dist` which the backend serves.

Files created/important

- `Dockerfile` (multi-stage) — at repo root
- `.dockerignore` — at repo root
- `requirements.txt` — pinned from current environment

Security / Notes

- Do not commit secrets. Add any runtime secrets using environment variables in your hosting provider or in a secured CI/CD secret store.
- For Hugging Face deployment, set the startup command to run Uvicorn if needed (the Docker CMD already starts Uvicorn).
