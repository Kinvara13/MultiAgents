"""NodeExecution model representing a single node's execution within a workflow run.

Each node in a workflow DAG corresponds to one NodeExecution record during a run.
This model captures the execution state, inputs/outputs, timing, and resource usage
(e.g., token counts) for observability and debugging.
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


class NodeExecution(Base):
    """NodeExecution model — execution record for a single workflow node.

    Attributes:
        id: Unique identifier (UUID).
        run_id: Foreign key to the parent workflow run.
        node_id: Workflow node identifier (from DAG definition, not UUID).
        agent_id: Foreign key to the agent that executed this node.
        agent_name: Cached agent name at execution time.
        status: Current execution status.
        inputs: Input data passed to the node.
        outputs: Output data produced by the node.
        started_at: When node execution began.
        completed_at: When node execution finished.
        duration_ms: Node execution time in milliseconds.
        tokens_input: Number of input tokens consumed.
        tokens_output: Number of output tokens generated.
        error: Error details if the node failed.
        retry_count: Number of retry attempts.
        artifact_ids: References to artifacts produced by this execution.
        created_at: Record creation timestamp.
    """

    __tablename__ = "node_executions"

    # Primary key
    id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique node execution identifier",
    )

    # Foreign key to parent workflow run
    run_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("workflow_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Parent workflow run identifier",
    )

    # Node identity (references the node_id in the workflow definition JSON)
    node_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Workflow node ID from DAG definition (not a UUID FK)",
    )

    # Agent reference (nullable — some nodes may not use an agent)
    agent_id: Mapped[Optional[sa_types.Uuid]] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Agent that executed this node",
    )
    agent_name: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        comment="Cached agent name at execution time",
    )

    # Execution status
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="pending",
        index=True,
        comment="Execution status: 'pending', 'running', 'completed', 'failed', 'skipped', 'retrying'",
    )

    # Data
    inputs: Mapped[Optional[dict[str, Any]]] = mapped_column(
        sa_types.JSON,
        nullable=True,
        comment="Input data passed to the node",
    )
    outputs: Mapped[Optional[dict[str, Any]]] = mapped_column(
        sa_types.JSON,
        nullable=True,
        comment="Output data produced by the node",
    )

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="When node execution began",
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="When node execution finished",
    )
    duration_ms: Mapped[Optional[int]] = mapped_column(
        nullable=True,
        comment="Node execution time in milliseconds",
    )

    # Resource usage
    tokens_input: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Number of input tokens consumed",
    )
    tokens_output: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Number of output tokens generated",
    )

    # Error handling
    error: Mapped[Optional[dict[str, Any]]] = mapped_column(
        sa_types.JSON,
        nullable=True,
        comment="Error details if the node failed",
    )
    retry_count: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Number of retry attempts",
    )

    # Artifact references
    artifact_ids: Mapped[list[sa_types.Uuid]] = mapped_column(
        ARRAY(sa_types.Uuid(as_uuid=False)),
        nullable=False,
        default=list,
        comment="References to artifacts produced by this execution",
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
        back_populates="node_executions",
        doc="Parent workflow run",
    )
    agent: Mapped[Optional["Agent"]] = relationship(
        "Agent",
        back_populates="node_executions",
        doc="Agent that executed this node",
    )
    artifacts: Mapped[list["Artifact"]] = relationship(
        "Artifact",
        back_populates="node_execution",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        doc="Artifacts produced by this node execution",
    )

    def __repr__(self) -> str:
        return (
            f"<NodeExecution(id={self.id}, run_id={self.run_id}, "
            f"node_id='{self.node_id}', status='{self.status}')>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize the node execution to a dictionary."""
        return {
            "id": str(self.id),
            "run_id": str(self.run_id),
            "node_id": self.node_id,
            "agent_id": str(self.agent_id) if self.agent_id else None,
            "agent_name": self.agent_name,
            "status": self.status,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "tokens_input": self.tokens_input,
            "tokens_output": self.tokens_output,
            "error": self.error,
            "retry_count": self.retry_count,
            "artifact_ids": [str(aid) for aid in self.artifact_ids],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
