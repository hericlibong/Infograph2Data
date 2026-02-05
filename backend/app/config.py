from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Infograph2Data"
    app_version: str = "0.1.0"
    debug: bool = False

    # CORS origins (comma-separated in env, but we use a list)
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Storage paths (relative to project root)
    storage_dir: str = "backend/app/storage"
    exports_dir: str = "exports"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
