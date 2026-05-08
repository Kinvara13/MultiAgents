"""
Event Store for AgentNexus.

Implements event sourcing storage for audit trails, execution replay,
and temporal querying.  Events are appended as immutable records and
retrieved by aggregate ID with optional version filtering.

Design decisions:
- Events are **append-only** – never updated or deleted.
- Each event carries a monotonically increasing version number per aggregate.
- The store supports both database (PostgreSQL) and Redis (cache) layers.

Example::

    store = EventStore(db_session, redis_client)
    await store.append([
        {"aggregate_id": "run-123", "type": "node.completed", "payload": {...}}
    ])
    events = await store.get_events("run-123", from_version=5)
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class EventStoreError(Exception):
    """Base exception for event store operations."""


class EventSerializationError(EventStoreError):
    """Raised when event data cannot be serialized."""


class ConcurrencyError(EventStoreError):
    """Raised on version conflict (optimistic concurrency)."""


# ---------------------------------------------------------------------------
# Event Store
# ---------------------------------------------------------------------------


class EventStore:
    """Immutable event log implementing event sourcing patterns.

    Attributes:
        db: Async SQLAlchemy session.
        redis: Async Redis client (optional – used for hot reads).
        aggregate_type: Default aggregate type name for stored events.
    """

    # Redis TTL for cached event streams (seconds)
    REDIS_TTL: int = 3600 * 24  # 24 hours

    def __init__(
        self,
        db_session: Any = None,
        redis_client: Any | None = None,
        db_path: str = None,
    ) -> None:
        """Initialize the event store.

        Args:
            db_session: Async SQLAlchemy session.
            redis_client: Optional async Redis client for hot-read caching.
            db_path: Optional SQLite path for in-memory testing (":memory:").
        """
        self.db = db_session
        self.redis = redis_client
        self._db_path = db_path
        # In-memory mode for testing
        if db_path == ":memory:" and db_session is None:
            import sqlite3
            self._conn = sqlite3.connect(":memory:")
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS event_store (
                    aggregate_id TEXT, event_type TEXT, payload TEXT,
                    version INTEGER, created_at REAL
                )
            """)
            self._conn.commit()

    def _is_memory_mode(self) -> bool:
        return self._db_path == ":memory:" and self.db is None

    # -- core API ------------------------------------------------------------

    async def append(self, events: list[dict]) -> list[dict]:
        """Append one or more events to the event log.

        Each event dictionary should contain at least:

        - ``aggregate_id`` – the entity identifier (e.g. run UUID).
        - ``type`` – event type string (e.g. ``node.completed``).
        - ``payload`` – serializable event payload.

        The store automatically assigns ``version`` and ``timestamp``.

        Args:
            events: List of event dictionaries to append.

        Returns:
            The list of persisted events with ``version`` and
            ``timestamp`` fields populated.

        Raises:
            EventSerializationError: If an event payload cannot be serialized.
            EventStoreError: If the database write fails.
        """
        if not events:
            return []

        persisted: list[dict] = []

        # In-memory mode (for testing)
        if self._is_memory_mode():
            for event in events:
                aggregate_id: str = event["aggregate_id"]
                # Support both "type" and "event_type" keys
                event_type: str = event.get("type") or event.get("event_type", "unknown")
                payload: dict[str, Any] = event.get("payload", {})
                payload_json = json.dumps(payload)

                cursor = self._conn.execute(
                    "SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_id = ?",
                    (aggregate_id,)
                )
                version = cursor.fetchone()[0] or 1

                self._conn.execute(
                    "INSERT INTO event_store (aggregate_id, event_type, payload, version, created_at) VALUES (?, ?, ?, ?, ?)",
                    (aggregate_id, event_type, payload_json, version, time.time())
                )

                persisted_event = {
                    "id": str(uuid.uuid4()),
                    "aggregate_id": aggregate_id,
                    "type": event_type,
                    "payload": payload,
                    "version": version,
                    "timestamp": time.time(),
                }
                persisted.append(persisted_event)
            self._conn.commit()
            return persisted

        try:
            from sqlalchemy import text

            for event in events:
                aggregate_id: str = event["aggregate_id"]
                event_type: str = event["type"]
                payload: dict[str, Any] = event.get("payload", {})

                # Serialize payload
                try:
                    payload_json = json.dumps(payload)
                except (TypeError, ValueError) as exc:
                    raise EventSerializationError(
                        f"Cannot serialize payload for event '{event_type}': {exc}"
                    ) from exc

                # Insert and return the assigned version
                result = await self.db.execute(
                    text(
                        """
                        INSERT INTO event_store (
                            aggregate_id,
                            event_type,
                            payload,
                            version,
                            created_at
                        ) VALUES (
                            :aggregate_id,
                            :event_type,
                            :payload,
                            (
                                SELECT COALESCE(MAX(version), 0) + 1
                                FROM event_store
                                WHERE aggregate_id = :aggregate_id
                            ),
                            NOW()
                        )
                        RETURNING version, created_at
                        """
                    ),
                    {
                        "aggregate_id": aggregate_id,
                        "event_type": event_type,
                        "payload": payload_json,
                    },
                )
                row = result.fetchone()
                version = row.version if row else 0
                created_at = row.created_at if row else None

                persisted_event = {
                    "id": str(uuid.uuid4()),
                    "aggregate_id": aggregate_id,
                    "type": event_type,
                    "payload": payload,
                    "version": version,
                    "timestamp": created_at.isoformat() if created_at else time.time(),
                }
                persisted.append(persisted_event)

            await self.db.commit()

            # Cache latest events in Redis
            if self.redis:
                await self._cache_events(persisted)

            logger.info(
                "Appended %d event(s) (%d aggregates)",
                len(persisted),
                len({e["aggregate_id"] for e in persisted}),
            )

        except EventSerializationError:
            raise
        except Exception as exc:
            raise EventStoreError(f"Failed to append events: {exc}") from exc

        return persisted

    async def get_events(
        self,
        aggregate_id: str,
        from_version: int = 0,
    ) -> list[dict]:
        """Get all events for an aggregate starting from a given version.

        Args:
            aggregate_id: Entity identifier.
            from_version: Minimum version to include (inclusive, 0 = all).

        Returns:
            List of event dictionaries ordered by version ascending.

        Raises:
            EventStoreError: If the database query fails.
        """
        # In-memory mode (for testing)
        if self._is_memory_mode():
            cursor = self._conn.execute(
                "SELECT aggregate_id, event_type, payload, version, created_at FROM event_store WHERE aggregate_id = ? AND version >= ? ORDER BY version ASC",
                (aggregate_id, from_version)
            )
            events = []
            for row in cursor.fetchall():
                events.append({
                    "aggregate_id": row[0], "type": row[1],
                    "payload": json.loads(row[2]), "version": row[3],
                    "timestamp": row[4],
                })
            return events

        # Try Redis first for hot reads
        if self.redis and from_version == 0:
            cached = await self._get_cached_events(aggregate_id)
            if cached is not None:
                logger.debug(
                    "Events for aggregate '%s' served from cache", aggregate_id
                )
                return cached

        try:
            from sqlalchemy import text

            result = await self.db.execute(
                text(
                    """
                    SELECT
                        aggregate_id,
                        event_type,
                        payload,
                        version,
                        created_at
                    FROM event_store
                    WHERE aggregate_id = :aggregate_id
                      AND version >= :from_version
                    ORDER BY version ASC
                    """
                ),
                {
                    "aggregate_id": aggregate_id,
                    "from_version": from_version,
                },
            )

            events: list[dict] = []
            for row in result.mappings().all():
                events.append(
                    {
                        "aggregate_id": row["aggregate_id"],
                        "type": row["event_type"],
                        "payload": json.loads(row["payload"]),
                        "version": row["version"],
                        "timestamp": (
                            row["created_at"].isoformat()
                            if row["created_at"]
                            else None
                        ),
                    }
                )

            # Cache result
            if self.redis and from_version == 0:
                await self._cache_events(events)

            logger.debug(
                "Retrieved %d event(s) for aggregate '%s' (from_version=%d)",
                len(events),
                aggregate_id,
                from_version,
            )
            return events

        except Exception as exc:
            raise EventStoreError(
                f"Failed to get events for aggregate '{aggregate_id}': {exc}"
            ) from exc

    async def get_latest_version(self, aggregate_id: str) -> int:
        """Get the latest version number for an aggregate.

        Args:
            aggregate_id: Entity identifier.

        Returns:
            Highest version number, or ``0`` if no events exist.
        """
        # In-memory mode (for testing)
        if self._is_memory_mode():
            cursor = self._conn.execute(
                "SELECT COALESCE(MAX(version), 0) FROM event_store WHERE aggregate_id = ?",
                (aggregate_id,)
            )
            row = cursor.fetchone()
            return row[0] or 0

        # Try Redis
        if self.redis:
            try:
                cached_latest = await self.redis.hget(
                    f"events:{aggregate_id}", "latest_version"
                )
                if cached_latest is not None:
                    return int(cached_latest)
            except Exception:
                pass

        try:
            from sqlalchemy import text

            result = await self.db.execute(
                text(
                    """
                    SELECT COALESCE(MAX(version), 0) AS latest_version
                    FROM event_store
                    WHERE aggregate_id = :aggregate_id
                    """
                ),
                {"aggregate_id": aggregate_id},
            )
            row = result.fetchone()
            version = row.latest_version if row else 0

            # Update Redis cache
            if self.redis:
                await self.redis.hset(
                    f"events:{aggregate_id}", "latest_version", str(version)
                )

            return version

        except Exception as exc:
            raise EventStoreError(
                f"Failed to get latest version for aggregate '{aggregate_id}': {exc}"
            ) from exc

    # -- batch / advanced queries --------------------------------------------

    async def get_all_aggregate_ids(
        self,
        event_type: str | None = None,
        limit: int = 1000,
    ) -> list[str]:
        """List all aggregate IDs that have stored events.

        Args:
            event_type: Optional filter by event type.
            limit: Maximum number of IDs to return.

        Returns:
            List of unique aggregate IDs.
        """
        try:
            from sqlalchemy import text

            if event_type:
                result = await self.db.execute(
                    text(
                        """
                        SELECT DISTINCT aggregate_id
                        FROM event_store
                        WHERE event_type = :event_type
                        LIMIT :limit
                        """
                    ),
                    {"event_type": event_type, "limit": limit},
                )
            else:
                result = await self.db.execute(
                    text(
                        """
                        SELECT DISTINCT aggregate_id
                        FROM event_store
                        LIMIT :limit
                        """
                    ),
                    {"limit": limit},
                )

            return [row[0] for row in result.fetchall()]

        except Exception as exc:
            raise EventStoreError(f"Failed to list aggregate IDs: {exc}") from exc

    async def get_events_by_type(
        self,
        event_type: str,
        aggregate_id: str | None = None,
        limit: int = 1000,
    ) -> list[dict]:
        """Get events filtered by event type.

        Args:
            event_type: Event type string to filter by.
            aggregate_id: Optional aggregate to restrict to.
            limit: Maximum events to return.

        Returns:
            List of matching event dictionaries.
        """
        try:
            from sqlalchemy import text

            if aggregate_id:
                result = await self.db.execute(
                    text(
                        """
                        SELECT
                            aggregate_id,
                            event_type,
                            payload,
                            version,
                            created_at
                        FROM event_store
                        WHERE event_type = :event_type
                          AND aggregate_id = :aggregate_id
                        ORDER BY created_at DESC
                        LIMIT :limit
                        """
                    ),
                    {
                        "event_type": event_type,
                        "aggregate_id": aggregate_id,
                        "limit": limit,
                    },
                )
            else:
                result = await self.db.execute(
                    text(
                        """
                        SELECT
                            aggregate_id,
                            event_type,
                            payload,
                            version,
                            created_at
                        FROM event_store
                        WHERE event_type = :event_type
                        ORDER BY created_at DESC
                        LIMIT :limit
                        """
                    ),
                    {"event_type": event_type, "limit": limit},
                )

            events: list[dict] = []
            for row in result.mappings().all():
                events.append(
                    {
                        "aggregate_id": row["aggregate_id"],
                        "type": row["event_type"],
                        "payload": json.loads(row["payload"]),
                        "version": row["version"],
                        "timestamp": (
                            row["created_at"].isoformat()
                            if row["created_at"]
                            else None
                        ),
                    }
                )
            return events

        except Exception as exc:
            raise EventStoreError(
                f"Failed to get events by type '{event_type}': {exc}"
            ) from exc

    # -- replay --------------------------------------------------------------

    async def replay(
        self,
        aggregate_id: str,
        handler: Any,
    ) -> Any:
        """Replay all events for an aggregate through a handler function.

        This is the core of event-sourced state reconstruction.  The handler
        receives each event in order and mutates (or returns) aggregate state.

        Args:
            aggregate_id: Entity identifier.
            handler: Callable accepting ``(state, event)`` and returning
                updated state.

        Returns:
            Final state after all events have been applied.
        """
        events = await self.get_events(aggregate_id)
        state: Any = None
        for event in events:
            state = handler(state, event)
        logger.info(
            "Replayed %d event(s) for aggregate '%s'", len(events), aggregate_id
        )
        return state

    # -- Redis cache helpers -------------------------------------------------

    async def _cache_events(self, events: list[dict]) -> None:
        """Write events to the Redis cache.

        Args:
            events: List of event dictionaries to cache.
        """
        if not self.redis or not events:
            return

        try:
            # Group by aggregate_id
            by_aggregate: dict[str, list[dict]] = {}
            for event in events:
                agg_id = event["aggregate_id"]
                by_aggregate.setdefault(agg_id, []).append(event)

            for agg_id, agg_events in by_aggregate.items():
                redis_key = f"events:{agg_id}"
                # Store serialized events list
                await self.redis.hset(
                    redis_key,
                    "events",
                    json.dumps(agg_events),
                )
                # Update latest version
                latest_version = max(e.get("version", 0) for e in agg_events)
                await self.redis.hset(
                    redis_key,
                    "latest_version",
                    str(latest_version),
                )
                await self.redis.expire(redis_key, self.REDIS_TTL)

        except Exception as exc:
            logger.warning("Failed to cache events in Redis: %s", exc)

    async def _get_cached_events(self, aggregate_id: str) -> list[dict] | None:
        """Retrieve cached events from Redis.

        Args:
            aggregate_id: Entity identifier.

        Returns:
            List of event dictionaries if cache hit, else ``None``.
        """
        if not self.redis:
            return None

        try:
            redis_key = f"events:{aggregate_id}"
            cached = await self.redis.hget(redis_key, "events")
            if cached:
                return json.loads(cached)
            return None
        except Exception:
            return None

    async def invalidate_cache(self, aggregate_id: str) -> None:
        """Invalidate the Redis cache for an aggregate.

        Args:
            aggregate_id: Entity identifier.
        """
        if self.redis:
            await self.redis.delete(f"events:{aggregate_id}")
            logger.debug("Cache invalidated for aggregate '%s'", aggregate_id)
