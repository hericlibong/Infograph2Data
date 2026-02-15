from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException

from backend.app.config import settings
from backend.app.routers import export, extraction, health, identify, review, upload

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Transform infographics, charts, and PDF pages into structured data.",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(upload.router)
app.include_router(extraction.router)
app.include_router(identify.router)
app.include_router(review.router)
app.include_router(export.router)

# Serve frontend static files (React build)
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/favicon.ico")
async def favicon():
    return FileResponse("frontend/dist/favicon.ico")

@app.get("/")
async def root():
    return FileResponse("frontend/dist/index.html")

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Don't serve index for API/static paths
    if full_path.startswith(("api", "files", "extract", "health")):
        raise HTTPException(status_code=404)
    return FileResponse("frontend/dist/index.html")
