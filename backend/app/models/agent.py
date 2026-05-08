"""Agent model representing an AI agent in the system.

An Agent can be either a local model (e.g., Ollama) or a remote service
(e.g., OpenAI, Anthropic). Agents are the primary compute units that
execute tasks within workflow nodes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import String, ARRAY, Float, types as sa_types
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def now_utc() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Agent(Base):
    """AI Agent model — represents an invokable AI model or service.

    Attributes:
        id: Unique identifier (UUID).
        name: Human-readable agent name (e.g., "Claude").
        slug: URL-safe unique identifier (e.g., "claude").
        type: Agent type — 'local' (self-hosted) or 'remote' (API).
        status: Current operational status.
        endpoint: API endpoint URL for remote agents.
        api_key: Encrypted API key for remote agents.
        config: Extended configuration as JSON.
        capabilities: List of capability tags (e.g., 'code_generation').
        description: Optional human-readable description.
        icon: Icon identifier or URL.
        color: Hex color string for UI theming.
        total_tasks: Cumulative number of tasks executed.
        success_rate: Percentage of successful executions (0.0–100.0).
        avg_duration_ms: Average task duration in milliseconds.
        last_active_at: Last time the agent was invoked.
        created_at: Record creation timestamp.
        updated_at: Record last-update timestamp.
    """

    __tablename__ = "agents"

    # Primary key
    id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique agent identifier",
    )

    # Identity
    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="Human-readable agent name (e.g., 'Claude')",
    )
    slug: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
        comment="URL-safe unique identifier (e.g., 'claude')",
    )

    # Classification
    type: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="Agent type: 'local' or 'remote'",
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="offline",
        comment="Operational status: 'online', 'offline', 'busy', 'error'",
    )

    # Connection details (for remote agents)
    endpoint: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        comment="API endpoint URL for remote agents",
    )
    api_key: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        comment="Encrypted API key for remote agents",
    )

    # Configuration & capabilities
    config: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        default=dict,
        comment="Extended agent configuration as JSON",
    )
    capabilities: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        comment="Capability tags (e.g., ['code_generation', 'code_review'])",
    )

    # Presentation
    description: Mapped[Optional[str]] = mapped_column(
        sa_types.TEXT,
        nullable=True,
        comment="Human-readable description of the agent",
    )
    icon: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        comment="Icon identifier or URL",
    )
    color: Mapped[Optional[str]] = mapped_column(
        String(7),
        nullable=True,
        comment="Hex color string for UI theming (e.g., '#FF5733')",
    )

    # Statistics
    total_tasks: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Total number of tasks executed by this agent",
    )
    success_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=100.0,
        comment="Percentage of successful executions (0.0–100.0)",
    )
    avg_duration_ms: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Average task duration in milliseconds",
    )

    # Timestamps
    last_active_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="Last time the agent was invoked",
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=now_utc,
        comment="Record creation timestamp",
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=now_utc,
        onupdate=now_utc,
        comment="Record last-update timestamp",
    )

    # Relationships
    node_executions: Mapped[list["NodeExecution"]] = relationship(
        "NodeExecution",
        back_populates="agent",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        doc="Node executions performed by this agent",
    )
    artifacts: Mapped[list["Artifact"]] = relationship(
        "Artifact",
        back_populates="agent",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        doc="Artifacts produced by this agent",
    )

    def __repr__(self) -> str:
        return (
            f"<Agent(id={self.id}, name='{self.name}', slug='{self.slug}', "
            f"type='{self.type}', status='{self.status}')>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize the agent to a dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "slug": self.slug,
            "type": self.type,
            "status": self.status,
            "endpoint": self.endpoint,
            "config": self.config,
            "capabilities": self.capabilities,
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "total_tasks": self.total_tasks,
            "success_rate": self.success_rate,
            "avg_duration_ms": self.avg_duration_ms,
            "last_active_at": self.last_active_at.isoformat() if self.last_active_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
