from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint for monitoring and deployment verification."""
    from backend.app.config import settings

    return {"status": "healthy", "version": settings.app_version}
