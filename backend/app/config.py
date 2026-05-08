"""Application configuration management."""
import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "AgentNexus"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://agentnexus:agentnexus_secret@localhost:5432/agentnexus"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin_secret"
    MINIO_BUCKET: str = "agentnexus"
    MINIO_SECURE: bool = False

    # JWT
    JWT_SECRET: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    # Workflow Engine
    WORKFLOW_MAX_EXECUTION_TIME: int = 3600  # seconds
    WORKFLOW_DEFAULT_TIMEOUT: int = 300  # per-node timeout
    WORKFLOW_MAX_RETRIES: int = 3

    # Agent
    AGENT_HEALTH_CHECK_INTERVAL: int = 30  # seconds
    AGENT_REQUEST_TIMEOUT: int = 300  # seconds

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
