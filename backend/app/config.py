"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List


class Settings:
    """Application settings. All values are read from environment variables
    with sensible defaults for local development."""

    # ─── Core ────────────────────────────────────────────────
    APP_NAME: str = os.environ.get("APP_NAME", "AgentNexus")
    APP_VERSION: str = os.environ.get("APP_VERSION", "1.0.0")
    DEBUG: bool = os.environ.get("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")

    # ─── Database ────────────────────────────────────────────
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://agentnexus:agentnexus_secret@localhost:5432/agentnexus",
    )

    # ─── Redis ───────────────────────────────────────────────
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # ─── MinIO / S3 ──────────────────────────────────────────
    MINIO_ENDPOINT: str = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.environ.get("MINIO_SECRET_KEY", "minioadmin_secret")
    MINIO_BUCKET: str = os.environ.get("MINIO_BUCKET", "agentnexus")
    MINIO_SECURE: bool = os.environ.get("MINIO_SECURE", "false").lower() == "true"

    # ─── API Keys ────────────────────────────────────────────
    ANTHROPIC_API_KEY: str | None = os.environ.get("ANTHROPIC_API_KEY")
    OPENAI_API_KEY: str | None = os.environ.get("OPENAI_API_KEY")

    # ─── JWT ─────────────────────────────────────────────────
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-me-in-production")
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS: int = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))

    # ─── CORS ────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")

    # ─── Workflow Engine ─────────────────────────────────────
    WORKFLOW_MAX_EXECUTION_TIME: int = int(os.environ.get("WORKFLOW_MAX_EXECUTION_TIME", "3600"))
    WORKFLOW_DEFAULT_TIMEOUT: int = int(os.environ.get("WORKFLOW_DEFAULT_TIMEOUT", "300"))
    WORKFLOW_MAX_RETRIES: int = int(os.environ.get("WORKFLOW_MAX_RETRIES", "3"))

    # ─── Agent ───────────────────────────────────────────────
    AGENT_HEALTH_CHECK_INTERVAL: int = int(os.environ.get("AGENT_HEALTH_CHECK_INTERVAL", "30"))
    AGENT_REQUEST_TIMEOUT: int = int(os.environ.get("AGENT_REQUEST_TIMEOUT", "300"))

    @classmethod
    def validate(cls) -> list[str]:
        """Validate critical settings. Returns list of warnings."""
        warnings = []
        if "change-me" in cls.JWT_SECRET.lower() or "change_me" in cls.JWT_SECRET.lower():
            warnings.append("JWT_SECRET uses default value - change for production!")
        if not cls.ANTHROPIC_API_KEY:
            warnings.append("ANTHROPIC_API_KEY not set - Claude agent will not work")
        if not cls.OPENAI_API_KEY:
            warnings.append("OPENAI_API_KEY not set - Codex agent will not work")
        return warnings


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
