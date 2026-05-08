"""Workflow and WorkflowRun models.

A Workflow is a directed acyclic graph (DAG) of nodes connected by edges.
Each node represents an agent invocation or control-flow step. Workflows
can be triggered manually, on a schedule, via webhook, or by system events.

A WorkflowRun represents a single execution instance of a workflow.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import String, ForeignKey, types as sa_types
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def now_utc() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Workflow(Base):
    """Workflow model — a reusable DAG of agent-execution steps.

    Attributes:
        id: Unique identifier (UUID).
        name: Human-readable workflow name.
        slug: URL-safe unique identifier.
        description: Optional human-readable description.
        version: Semantic version string.
        definition: DAG definition with nodes and edges.
        status: Publication status of the workflow.
        is_template: Whether this workflow is a reusable template.
        trigger_type: How the workflow is triggered.
        trigger_config: Trigger-specific configuration.
        owner_id: Identifier of the workflow owner.
        run_count: Total number of executions.
        success_count: Number of successful executions.
        fail_count: Number of failed executions.
        created_at: Record creation timestamp.
        updated_at: Record last-update timestamp.
    """

    __tablename__ = "workflows"

    # Primary key
    id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique workflow identifier",
    )

    # Identity
    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="Human-readable workflow name",
    )
    slug: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
        comment="URL-safe unique identifier",
    )
    description: Mapped[Optional[str]] = mapped_column(
        sa_types.TEXT,
        nullable=True,
        comment="Human-readable description of the workflow",
    )
    version: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="1.0.0",
        comment="Semantic version string",
    )

    # Definition — DAG structure
    definition: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        comment="DAG definition: {nodes: [...], edges: [...]}",
    )

    # Status & templating
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="draft",
        comment="Publication status: 'draft', 'published', 'archived'",
    )
    is_template: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
        comment="Whether this workflow is a reusable template",
    )

    # Trigger configuration
    trigger_type: Mapped[Optional[str]] = mapped_column(
        String(16),
        nullable=True,
        comment="Trigger type: 'manual', 'schedule', 'webhook', 'event'",
    )
    trigger_config: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        default=dict,
        comment="Trigger-specific configuration (e.g., cron expression)",
    )

    # Ownership
    owner_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="system",
        comment="Identifier of the workflow owner",
    )

    # Statistics
    run_count: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Total number of executions",
    )
    success_count: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Number of successful executions",
    )
    fail_count: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Number of failed executions",
    )

    # Timestamps
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
    runs: Mapped[list["WorkflowRun"]] = relationship(
        "WorkflowRun",
        back_populates="workflow",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="desc(WorkflowRun.created_at)",
        doc="Execution runs of this workflow",
    )

    def __repr__(self) -> str:
        return (
            f"<Workflow(id={self.id}, name='{self.name}', slug='{self.slug}', "
            f"status='{self.status}', version='{self.version}')>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize the workflow to a dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "version": self.version,
            "definition": self.definition,
            "status": self.status,
            "is_template": self.is_template,
            "trigger_type": self.trigger_type,
            "trigger_config": self.trigger_config,
            "owner_id": self.owner_id,
            "run_count": self.run_count,
            "success_count": self.success_count,
            "fail_count": self.fail_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkflowRun(Base):
    """WorkflowRun model — a single execution instance of a workflow.

    Attributes:
        id: Unique identifier (UUID).
        workflow_id: Foreign key to the parent workflow.
        thread_id: Session isolation identifier for concurrent runs.
        status: Current execution status.
        inputs: Input parameters for this run.
        outputs: Output values produced by this run.
        started_at: When execution began.
        completed_at: When execution finished.
        duration_ms: Total execution time in milliseconds.
        error: Error details if the run failed.
        triggered_by: Identifier of the entity that triggered the run.
        trigger_type: How this run was triggered.
        created_at: Record creation timestamp.
    """

    __tablename__ = "workflow_runs"

    # Primary key
    id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique run identifier",
    )

    # Foreign key to workflow
    workflow_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Parent workflow identifier",
    )

    # Session isolation
    thread_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        nullable=False,
        default=uuid.uuid4,
        index=True,
        comment="Session isolation identifier for concurrent runs",
    )

    # Execution status
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="pending",
        index=True,
        comment="Execution status: 'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'",
    )

    # Data
    inputs: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        default=dict,
        comment="Input parameters for this run",
    )
    outputs: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        default=dict,
        comment="Output values produced by this run",
    )

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="When execution began",
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="When execution finished",
    )
    duration_ms: Mapped[Optional[int]] = mapped_column(
        nullable=True,
        comment="Total execution time in milliseconds",
    )

    # Error handling
    error: Mapped[Optional[dict[str, Any]]] = mapped_column(
        sa_types.JSON,
        nullable=True,
        comment="Error details if the run failed",
    )

    # Trigger info
    triggered_by: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="Identifier of the entity that triggered the run",
    )
    trigger_type: Mapped[Optional[str]] = mapped_column(
        String(16),
        nullable=True,
        comment="How this run was triggered",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=now_utc,
        comment="Record creation timestamp",
    )

    # Relationships
    workflow: Mapped["Workflow"] = relationship(
        "Workflow",
        back_populates="runs",
        doc="Parent workflow",
    )
    node_executions: Mapped[list["NodeExecution"]] = relationship(
        "NodeExecution",
        back_populates="run",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="NodeExecution.created_at",
        doc="Individual node executions within this run",
    )
    checkpoints: Mapped[list["Checkpoint"]] = relationship(
        "Checkpoint",
        back_populates="run",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        doc="State checkpoints for this run",
    )
    artifacts: Mapped[list["Artifact"]] = relationship(
        "Artifact",
        back_populates="run",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        doc="Artifacts produced during this run",
    )

    def __repr__(self) -> str:
        return (
            f"<WorkflowRun(id={self.id}, workflow_id={self.workflow_id}, "
            f"status='{self.status}', thread_id={self.thread_id})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize the workflow run to a dictionary."""
        return {
            "id": str(self.id),
            "workflow_id": str(self.workflow_id),
            "thread_id": str(self.thread_id),
            "status": self.status,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "error": self.error,
            "triggered_by": self.triggered_by,
            "trigger_type": self.trigger_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
