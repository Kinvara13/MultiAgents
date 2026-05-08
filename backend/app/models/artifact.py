"""Artifact model representing a file or data artifact produced during execution.

Artifacts are the primary output mechanism for workflow nodes and agent executions.
They can be stored locally, on S3-compatible object storage (MinIO), or other
backends. Artifacts support versioning through a parent-child relationship chain.

Typical artifact types include:
- Generated code files
- Documentation (Markdown, PDF)
- Data files (JSON, CSV, Parquet)
- Logs and reports
- Images and charts
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import String, ForeignKey, ARRAY, BigInteger, types as sa_types
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def now_utc() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Artifact(Base):
    """Artifact model — a file or data object produced during workflow execution.

    Attributes:
        id: Unique identifier (UUID).
        name: Human-readable artifact name.
        path: Storage path or key.
        mime_type: MIME type of the artifact content.
        size_bytes: Size in bytes (nullable for references without known size).
        checksum: SHA-256 checksum for integrity verification.
        storage_type: Backend storage type.
        storage_ref: External storage reference (e.g., S3 URI).
        run_id: Parent workflow run (nullable for standalone artifacts).
        node_id: Producing node execution (nullable).
        agent_id: Producing agent (nullable).
        version: Version number within the artifact lineage.
        parent_id: Previous version in the lineage (nullable).
        metadata: Extended metadata as JSON.
        tags: Searchable tags.
        created_at: Record creation timestamp.
    """

    __tablename__ = "artifacts"

    # Primary key
    id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique artifact identifier",
    )

    # Identity
    name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="Human-readable artifact name",
    )
    path: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        comment="Storage path or key",
    )

    # Content metadata
    mime_type: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        comment="MIME type of the artifact content (e.g., 'text/plain')",
    )
    size_bytes: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="Size in bytes",
    )
    checksum: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="SHA-256 checksum for integrity verification",
    )

    # Storage backend
    storage_type: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="local",
        comment="Backend storage type: 'local', 's3', 'minio'",
    )
    storage_ref: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        comment="External storage reference (e.g., S3 URI)",
    )

    # Provenance — nullable foreign keys for flexibility
    run_id: Mapped[Optional[sa_types.Uuid]] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("workflow_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Parent workflow run that produced this artifact",
    )
    node_id: Mapped[Optional[sa_types.Uuid]] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("node_executions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Node execution that produced this artifact",
    )
    agent_id: Mapped[Optional[sa_types.Uuid]] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Agent that produced this artifact",
    )

    # Versioning
    version: Mapped[int] = mapped_column(
        nullable=False,
        default=1,
        comment="Version number within the artifact lineage",
    )
    parent_id: Mapped[Optional[sa_types.Uuid]] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("artifacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Previous version in the lineage",
    )

    # Extended metadata
    metadata: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        default=dict,
        comment="Extended metadata as JSON",
    )
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        comment="Searchable tags",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=now_utc,
        comment="Record creation timestamp",
    )

    # Relationships
    run: Mapped[Optional["WorkflowRun"]] = relationship(
        "WorkflowRun",
        back_populates="artifacts",
        doc="Parent workflow run",
    )
    node_execution: Mapped[Optional["NodeExecution"]] = relationship(
        "NodeExecution",
        back_populates="artifacts",
        doc="Producing node execution",
    )
    agent: Mapped[Optional["Agent"]] = relationship(
        "Agent",
        back_populates="artifacts",
        doc="Producing agent",
    )
    parent: Mapped[Optional["Artifact"]] = relationship(
        "Artifact",
        remote_side=[id],
        back_populates="children",
        doc="Previous version in the lineage",
    )
    children: Mapped[list["Artifact"]] = relationship(
        "Artifact",
        remote_side=[parent_id],
        back_populates="parent",
        lazy="selectin",
        doc="Subsequent versions in the lineage",
    )

    def __repr__(self) -> str:
        return (
            f"<Artifact(id={self.id}, name='{self.name}', "
            f"storage_type='{self.storage_type}', version={self.version})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize the artifact to a dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "path": self.path,
            "mime_type": self.mime_type,
            "size_bytes": self.size_bytes,
            "checksum": self.checksum,
            "storage_type": self.storage_type,
            "storage_ref": self.storage_ref,
            "run_id": str(self.run_id) if self.run_id else None,
            "node_id": str(self.node_id) if self.node_id else None,
            "agent_id": str(self.agent_id) if self.agent_id else None,
            "version": self.version,
            "parent_id": str(self.parent_id) if self.parent_id else None,
            "metadata": self.metadata,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
