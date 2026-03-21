from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://slmc:slmc@localhost:5432/slmc_omr"
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8
    UPLOAD_DIR: str = "/tmp/slmc_uploads"
    FILL_THRESHOLD: float = 0.50
    MAX_UPLOAD_SIZE_MB: int = 20
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
