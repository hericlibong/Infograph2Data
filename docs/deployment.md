# Deployment (Docker / Hugging Face)

This document explains the minimal changes performed to prepare the app to be served from a single port (e.g., Hugging Face Space) and how to build/run the application.

What was changed

- Frontend TypeScript: `frontend/tsconfig.app.json` now excludes test files from the app build: `"exclude": ["src/test", "**/*.test.ts", "**/*.test.tsx", "src/setupTests.ts"]`.
- Backend FastAPI: `backend/app/main.py` now serves the React build under `frontend/dist`:
  - `/assets` is mounted to `frontend/dist/assets`.
  - `/favicon.ico` and `/` return `frontend/dist/favicon.ico` and `frontend/dist/index.html` respectively.
  - A catch-all route returns `index.html` for SPA routing, except for paths starting with `api`, `files`, `extract` or `health` which are left to the API routers.

Build and run

1. Build the frontend (from repository root):

   cd frontend && npm run build

   This produces `frontend/dist` directory containing `index.html` and `assets/`.

2. Run the backend (ensure frontend/dist exists):

   uvicorn backend.app.main:app --host 0.0.0.0 --port 7860

Notes for Docker / Hugging Face

- Build the frontend during the image build step and ensure `frontend/dist` is copied into the final image.
- The app listens on a single port (7860) and serves both API and static SPA content.
- If deploying to Hugging Face Spaces, set the startup command to run Uvicorn at port 7860.
