"""Event model for event sourcing.

The Event model implements the event-sourcing pattern, storing every significant
change as an immutable event record. This enables:
- Complete audit trails
- State reconstruction at any point in time
- Event replay for debugging
- Integration with external event consumers

Events are partitioned by aggregate type and aggregate ID, following DDD
aggregate-root conventions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import String, types as sa_types
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def now_utc() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Event(Base):
    """Event model — immutable event record for event sourcing.

    Each event represents a single, atomic change to an aggregate's state.
    Events are append-only and never modified or deleted.

    Attributes:
        event_id: Unique identifier for this event (UUID).
        event_type: Semantic type of the event (e.g., 'workflow_run.started').
        aggregate_id: ID of the aggregate this event belongs to.
        aggregate_type: Type of aggregate (e.g., 'workflow_run', 'agent').
        version: Sequence number within the aggregate's event stream.
        payload: Event-specific data as JSON.
        metadata: Additional context as JSON (e.g., IP address, user agent).
        created_at: When the event was recorded.
    """

    __tablename__ = "events"

    # Primary key — named event_id to align with event-sourcing conventions
    event_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique event identifier",
    )

    # Event classification
    event_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="Semantic event type (e.g., 'workflow_run.started')",
    )

    # Aggregate identification (DDD aggregate root)
    aggregate_id: Mapped[sa_types.Uuid] = mapped_column(
        sa_types.Uuid(as_uuid=False),
        nullable=False,
        index=True,
        comment="ID of the aggregate this event belongs to (e.g., workflow_run_id)",
    )
    aggregate_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="Type of aggregate: 'workflow_run', 'agent', 'artifact'",
    )

    # Versioning within the aggregate stream
    version: Mapped[int] = mapped_column(
        nullable=False,
        comment="Sequence number within the aggregate's event stream",
    )

    # Event data
    payload: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        comment="Event-specific data as JSON",
    )
    metadata: Mapped[dict[str, Any]] = mapped_column(
        sa_types.JSON,
        nullable=False,
        default=dict,
        comment="Additional context: IP address, user agent, correlation ID, etc.",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=now_utc,
        index=True,
        comment="When the event was recorded",
    )

    # Table constraints and indexes
    __table_args__ = (
        # Composite index for efficient aggregate stream queries
        # This is the primary query pattern: get all events for an aggregate, ordered by version
        {"comment": "Event sourcing table — append-only, immutable event records"},
    )

    def __repr__(self) -> str:
        return (
            f"<Event(event_id={self.event_id}, event_type='{self.event_type}', "
            f"aggregate_type='{self.aggregate_type}', aggregate_id={self.aggregate_id}, "
            f"version={self.version})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize the event to a dictionary."""
        return {
            "event_id": str(self.event_id),
            "event_type": self.event_type,
            "aggregate_id": str(self.aggregate_id),
            "aggregate_type": self.aggregate_type,
            "version": self.version,
            "payload": self.payload,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
