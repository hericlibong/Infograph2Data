from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.routers import export, extraction, health, review, upload

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
app.include_router(review.router)
app.include_router(export.router)
