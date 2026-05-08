"""Pydantic schemas for the Artifact model.

Schemas cover artifact CRUD operations and responses, including support
for versioning metadata and storage backend details.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ───────────────────────────────────────────────
# Shared field definitions
# ───────────────────────────────────────────────

STORAGE_TYPES = {"local", "s3", "minio"}
SHA256_PATTERN = r"^[a-fA-F0-9]{64}$"


# ───────────────────────────────────────────────
# Base Schemas
# ───────────────────────────────────────────────


class ArtifactBase(BaseModel):
    """Base schema with shared artifact fields.

    Attributes:
        name: Human-readable artifact name.
        path: Storage path or key.
        mime_type: MIME type of the artifact content.
        storage_type: Backend storage type.
        storage_ref: External storage reference.
        metadata: Extended metadata dictionary.
        tags: Searchable tags.
    """

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    name: str = Field(
        ...,
        min_length=1,
        max_length=256,
        description="Human-readable artifact name",
        examples=["generated_code.py", "report.md", "data.json"],
    )
    path: str = Field(
        ...,
        min_length=1,
        max_length=512,
        description="Storage path or key",
        examples=["runs/2024-01/code.py", "s3://bucket/reports/doc.md"],
    )
    mime_type: Optional[str] = Field(
        default=None,
        max_length=128,
        description="MIME type of the artifact content (e.g., 'text/plain')",
        examples=["text/plain", "application/json", "text/markdown"],
    )
    storage_type: str = Field(
        default="local",
        pattern=r"^(local|s3|minio)$",
        description="Backend storage type: 'local', 's3', 'minio'",
    )
    storage_ref: Optional[str] = Field(
        default=None,
        max_length=512,
        description="External storage reference (e.g., S3 URI)",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Extended metadata as JSON",
        examples=[{"lines_of_code": 42, "language": "python"}],
    )
    tags: list[str] = Field(
        default_factory=list,
        description="Searchable tags",
        examples=[["code", "python", "generated"]],
    )


# ───────────────────────────────────────────────
# Request Schemas (Create / Update)
# ───────────────────────────────────────────────


class ArtifactCreate(ArtifactBase):
    """Schema for creating a new artifact.

    Extends ArtifactBase with optional fields for provenance and versioning.
    """

    size_bytes: Optional[int] = Field(
        default=None,
        ge=0,
        description="Size in bytes",
    )
    checksum: Optional[str] = Field(
        default=None,
        pattern=SHA256_PATTERN,
        description="SHA-256 checksum for integrity verification",
        examples=["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    )
    run_id: Optional[UUID] = Field(
        default=None,
        description="Parent workflow run that produced this artifact",
    )
    node_id: Optional[UUID] = Field(
        default=None,
        description="Node execution that produced this artifact",
    )
    agent_id: Optional[UUID] = Field(
        default=None,
        description="Agent that produced this artifact",
    )
    version: int = Field(
        default=1,
        ge=1,
        description="Version number within the artifact lineage",
    )
    parent_id: Optional[UUID] = Field(
        default=None,
        description="Previous version in the lineage",
    )

    @field_validator("checksum")
    @classmethod
    def checksum_to_lowercase(cls, v: Optional[str]) -> Optional[str]:
        """Normalize checksum to lowercase for consistent comparison."""
        if v is not None:
            return v.lower()
        return v


class ArtifactUpdate(BaseModel):
    """Schema for updating an existing artifact.

    All fields are optional — only provided fields will be updated.
    Note: Core storage fields (path, storage_ref, checksum) are immutable
    to maintain data integrity. Create a new version instead.
    """

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=256,
        description="Human-readable artifact name",
    )
    mime_type: Optional[str] = Field(
        default=None,
        max_length=128,
        description="MIME type of the artifact content",
    )
    metadata: Optional[dict[str, Any]] = Field(
        default=None,
        description="Extended metadata as JSON",
    )
    tags: Optional[list[str]] = Field(
        default=None,
        description="Searchable tags",
    )


# ───────────────────────────────────────────────
# Response Schemas
# ───────────────────────────────────────────────


class ArtifactResponse(ArtifactBase):
    """Schema for artifact responses (read operations).

    Includes all fields from the artifact record with provenance and versioning.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Unique artifact identifier")
    size_bytes: Optional[int] = Field(
        default=None,
        ge=0,
        description="Size in bytes",
    )
    checksum: Optional[str] = Field(
        default=None,
        description="SHA-256 checksum for integrity verification",
    )
    run_id: Optional[UUID] = Field(
        default=None,
        description="Parent workflow run",
    )
    node_id: Optional[UUID] = Field(
        default=None,
        description="Producing node execution",
    )
    agent_id: Optional[UUID] = Field(
        default=None,
        description="Producing agent",
    )
    version: int = Field(
        ...,
        ge=1,
        description="Version number within the artifact lineage",
    )
    parent_id: Optional[UUID] = Field(
        default=None,
        description="Previous version in the lineage",
    )
    created_at: datetime = Field(..., description="Record creation timestamp")


class ArtifactListResponse(BaseModel):
    """Schema for paginated artifact list responses.

    Attributes:
        items: List of artifacts on the current page.
        total: Total number of artifacts matching the query.
        page: Current page number (1-indexed).
        page_size: Number of items per page.
        pages: Total number of pages.
    """

    model_config = ConfigDict(from_attributes=True)

    items: list[ArtifactResponse] = Field(
        default_factory=list,
        description="List of artifacts on the current page",
    )
    total: int = Field(..., ge=0, description="Total number of matching artifacts")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")
