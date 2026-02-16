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

API_PREFIX = "/api"

app.include_router(health.router, prefix=API_PREFIX, tags=["Health"])
app.include_router(upload.router, prefix=API_PREFIX, tags=["Upload"])
app.include_router(extraction.router, prefix=API_PREFIX, tags=["Extraction"])
app.include_router(identify.router, prefix=API_PREFIX, tags=["Identify"])
app.include_router(review.router, prefix=API_PREFIX, tags=["Review"])
app.include_router(export.router, prefix=API_PREFIX, tags=["Export"])


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
