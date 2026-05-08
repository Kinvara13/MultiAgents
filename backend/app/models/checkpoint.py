"""Checkpoint model for workflow state persistence.

Checkpoints capture the full execution state of a workflow run at a given point
in time. They enable pause/resume functionality, fault tolerance, and debugging
by allowing the system to restore a workflow run from a saved state snapshot.

The checkpointing mechanism follows the event-sourcing pattern where each
checkpoint represents a deterministic state that the workflow can resume from.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import String, ForeignKey, ARRAY, types as sa_types
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def now_utc() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Checkpoint(Base):
    """Checkpoint model — persisted state snapshot of a workflow run.

    Checkpoints are used for:
    - Pause/resume functionality
    - Fault tolerance and recovery
    - Debugging and inspection
    - Replay and rewind capabilities

    Attributes:
        id: Unique identifier (UUID).
        thread_id: Session/thread identifier for grouping related checkpoints.
        workflow_id: Workflow identifier (denormalized for quick lookup).
        run_id: Foreign key to the parent workflow run.
        state: Full state snapshot as JSON (includes node outputs, context, etc.).
        next_nodes: List of node IDs scheduled for execution next.
        blob_ref: Reference to an external blob storage for large states.
        node_id: The node that triggered this checkpoint (if applicable).
        event_type: Type of event that caused the checkpoint.
        created_at: Record creation timestamp.
    """

    __tablename__ = "checkpoints"

    # Primary key
    id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique checkpoint identifier",
    )

    # Session identification (for grouping and lookup)
    thread_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        nullable=False,
        index=True,
        comment="Session/thread identifier for grouping related checkpoints",
    )

    # Workflow and run references
    workflow_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        nullable=False,
        index=True,
        comment="Workflow identifier (denormalized for quick lookup)",
    )
    run_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("workflow_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Parent workflow run identifier",
    )

    # State snapshot
    state: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        comment="Full state snapshot: node outputs, context variables, etc.",
    )

    # Execution position
    next_nodes: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        comment="Node IDs scheduled for execution next",
    )

    # External storage reference (for large states that exceed JSONB limits)
    blob_ref: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        comment="Reference to external blob storage for large state snapshots",
    )

    # Context
    node_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="The node that triggered this checkpoint (if applicable)",
    )
    event_type: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        comment="Type of event that caused the checkpoint (e.g., 'node_complete', 'pause')",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=now_utc,
        comment="Record creation timestamp",
    )

    # Relationships
    run: Mapped["WorkflowRun"] = relationship(
        "WorkflowRun",
        back_populates="checkpoints",
        doc="Parent workflow run",
    )

    def __repr__(self) -> str:
        return (
            f"<Checkpoint(id={self.id}, run_id={self.run_id}, "
            f"thread_id={self.thread_id}, event_type='{self.event_type}')>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize the checkpoint to a dictionary."""
        return {
            "id": str(self.id),
            "thread_id": str(self.thread_id),
            "workflow_id": str(self.workflow_id),
            "run_id": str(self.run_id),
            "state": self.state,
            "next_nodes": self.next_nodes,
            "blob_ref": self.blob_ref,
            "node_id": self.node_id,
            "event_type": self.event_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
