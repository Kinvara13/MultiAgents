"""
Checkpoint Manager for AgentNexus.

Provides persistent checkpointing for workflow execution state.  Checkpoints
allow workflows to be resumed after crashes, restarts, or explicit pauses.

Two storage layers are used:
1. **Database** – durable, long-term storage (PostgreSQL).
2. **Redis** – fast, short-term cache for hot recovery paths.

Example::

    manager = CheckpointManager(db_session, redis_client)
    await manager.save(run_id, thread_id, workflow_id, state, next_nodes)
    checkpoint = await manager.load_latest(thread_id, workflow_id)
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class CheckpointError(Exception):
    """Base exception for checkpoint operations."""


class CheckpointNotFoundError(CheckpointError):
    """Raised when a requested checkpoint does not exist."""


class CheckpointSerializationError(CheckpointError):
    """Raised when checkpoint data cannot be serialized or deserialized."""


# ---------------------------------------------------------------------------
# Checkpoint Manager
# ---------------------------------------------------------------------------


class CheckpointManager:
    """Manages workflow execution checkpoints.

    Checkpoints capture the full mutable state of a workflow run at a given
    point in time.  They are used for:

    - **Fault recovery** – resume after a crash by loading the latest checkpoint.
    - **Pause / resume** – allow users to pause long-running workflows.
    - **Audit** – inspect execution state at any past point.

    Attributes:
        db: Async SQLAlchemy session.
        redis: Async Redis client.
    """

    # Redis TTL for checkpoint cache entries (seconds)
    REDIS_TTL: int = 3600 * 24  # 24 hours

    def __init__(self, db_session: Any = None, redis_client: Any = None, db_path: str = None) -> None:
        """Initialize the checkpoint manager.

        Args:
            db_session: Async SQLAlchemy session.
            redis_client: Async Redis client.
            db_path: Optional SQLite path for in-memory testing (":memory:").
        """
        self.db = db_session
        self.redis = redis_client
        self._memory_store: list[dict] = []
        self._db_path = db_path
        # In-memory mode for testing
        if db_path == ":memory:" and db_session is None:
            import sqlite3
            self._conn = sqlite3.connect(":memory:")
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS workflow_checkpoints (
                    run_id TEXT, thread_id TEXT, workflow_id TEXT,
                    checkpoint_data TEXT, next_nodes TEXT, created_at REAL
                )
            """)
            self._conn.commit()

    def _is_memory_mode(self) -> bool:
        return self._db_path == ":memory:" and self.db is None

    # -- persistence ---------------------------------------------------------

    async def save(
        self,
        run_id: str,
        thread_id: str,
        workflow_id: str,
        state: dict[str, Any],
        next_nodes: list[str],
    ) -> dict:
        """Save a checkpoint to both database and Redis.

        Args:
            run_id: Unique workflow run identifier.
            thread_id: Conversation thread identifier.
            workflow_id: Workflow definition identifier.
            state: Serialized execution state (variables, outputs, history, …).
            next_nodes: IDs of nodes scheduled for execution next.

        Returns:
            The saved checkpoint record as a dictionary.

        Raises:
            CheckpointSerializationError: If *state* cannot be serialized.
            CheckpointError: If the database write fails.
        """
        try:
            state_json = json.dumps(state)
        except (TypeError, ValueError) as exc:
            raise CheckpointSerializationError(
                f"Failed to serialize checkpoint state: {exc}"
            ) from exc

        checkpoint_record = {
            "run_id": run_id,
            "thread_id": thread_id,
            "workflow_id": workflow_id,
            "state": state,
            "next_nodes": next_nodes,
            "created_at": time.time(),
            "version": state.get("_version", 0),
        }

        # In-memory mode (for testing)
        if self._is_memory_mode():
            self._conn.execute(
                "INSERT INTO workflow_checkpoints (run_id, thread_id, workflow_id, checkpoint_data, next_nodes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (run_id, thread_id, workflow_id, state_json, json.dumps(next_nodes), time.time())
            )
            self._conn.commit()
            return checkpoint_record

        # Persist to Redis (fast recovery path)
        try:
            redis_key = self._redis_key(run_id)
            await self.redis.hset(redis_key, "latest", json.dumps(checkpoint_record))
            await self.redis.expire(redis_key, self.REDIS_TTL)
            logger.debug("Checkpoint cached in Redis for run '%s'", run_id)
        except Exception as exc:
            logger.warning(
                "Failed to cache checkpoint in Redis for run '%s': %s",
                run_id,
                exc,
            )
            # Non-fatal: DB is the source of truth

        # Persist to database (durable storage)
        try:
            from sqlalchemy import text

            await self.db.execute(
                text(
                    """
                    INSERT INTO workflow_checkpoints (
                        run_id,
                        thread_id,
                        workflow_id,
                        checkpoint_data,
                        next_nodes,
                        created_at
                    ) VALUES (
                        :run_id,
                        :thread_id,
                        :workflow_id,
                        :checkpoint_data,
                        :next_nodes,
                        NOW()
                    )
                    """
                ),
                {
                    "run_id": run_id,
                    "thread_id": thread_id,
                    "workflow_id": workflow_id,
                    "checkpoint_data": state_json,
                    "next_nodes": json.dumps(next_nodes),
                },
            )
            await self.db.commit()
            logger.info(
                "Checkpoint saved for run '%s' (workflow='%s', nodes=%s)",
                run_id,
                workflow_id,
                next_nodes,
            )
        except Exception as exc:
            raise CheckpointError(
                f"Failed to save checkpoint for run '{run_id}': {exc}"
            ) from exc

        return checkpoint_record

    async def load_latest(
        self,
        thread_id: str,
        workflow_id: str,
    ) -> dict | None:
        """Load the latest checkpoint for a thread + workflow.

        Tries Redis first for speed, falls back to the database.

        Args:
            thread_id: Conversation thread identifier.
            workflow_id: Workflow definition identifier.

        Returns:
            The latest checkpoint dictionary, or ``None`` if none exists.

        Raises:
            CheckpointError: If the database query fails.
        """
        # In-memory mode (for testing)
        if self._is_memory_mode():
            cursor = self._conn.execute(
                "SELECT run_id, thread_id, workflow_id, checkpoint_data, next_nodes FROM workflow_checkpoints WHERE thread_id = ? AND workflow_id = ? ORDER BY created_at DESC LIMIT 1",
                (thread_id, workflow_id)
            )
            row = cursor.fetchone()
            if row:
                return {
                    "run_id": row[0], "thread_id": row[1], "workflow_id": row[2],
                    "state": json.loads(row[3]),
                    "next_nodes": json.loads(row[4]) if row[4] else [],
                }
            return None

        # Try Redis first
        try:
            # Scan Redis for any checkpoint belonging to this thread/workflow
            # We use a thread-scoped key pattern
            thread_key = f"checkpoint:thread:{thread_id}"
            cached = await self.redis.hget(thread_key, "latest")
            if cached:
                record = json.loads(cached)
                if record.get("workflow_id") == workflow_id:
                    logger.debug(
                        "Checkpoint loaded from Redis for thread '%s'", thread_id
                    )
                    return record
        except Exception as exc:
            logger.debug(
                "Redis checkpoint lookup failed for thread '%s': %s", thread_id, exc
            )

        # Fall back to database
        try:
            from sqlalchemy import text

            result = await self.db.execute(
                text(
                    """
                    SELECT
                        run_id,
                        thread_id,
                        workflow_id,
                        checkpoint_data,
                        next_nodes,
                        created_at
                    FROM workflow_checkpoints
                    WHERE thread_id = :thread_id AND workflow_id = :workflow_id
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"thread_id": thread_id, "workflow_id": workflow_id},
            )
            row = result.fetchone()
            if row is None:
                logger.info(
                    "No checkpoint found for thread '%s', workflow '%s'",
                    thread_id,
                    workflow_id,
                )
                return None

            checkpoint = {
                "run_id": row.run_id,
                "thread_id": row.thread_id,
                "workflow_id": row.workflow_id,
                "state": json.loads(row.checkpoint_data),
                "next_nodes": json.loads(row.next_nodes) if row.next_nodes else [],
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            logger.info(
                "Checkpoint loaded from DB for run '%s' (thread='%s')",
                checkpoint["run_id"],
                thread_id,
            )
            return checkpoint

        except Exception as exc:
            raise CheckpointError(
                f"Failed to load checkpoint for thread '{thread_id}': {exc}"
            ) from exc

    async def load_by_run(self, run_id: str) -> dict | None:
        """Load the latest checkpoint for a specific run.

        Args:
            run_id: Workflow run identifier.

        Returns:
            Checkpoint dictionary or ``None``.
        """
        # Try Redis
        try:
            redis_key = self._redis_key(run_id)
            cached = await self.redis.hget(redis_key, "latest")
            if cached:
                return json.loads(cached)
        except Exception:
            pass

        # Try DB
        try:
            from sqlalchemy import text

            result = await self.db.execute(
                text(
                    """
                    SELECT
                        run_id,
                        thread_id,
                        workflow_id,
                        checkpoint_data,
                        next_nodes,
                        created_at
                    FROM workflow_checkpoints
                    WHERE run_id = :run_id
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"run_id": run_id},
            )
            row = result.fetchone()
            if row is None:
                return None

            return {
                "run_id": row.run_id,
                "thread_id": row.thread_id,
                "workflow_id": row.workflow_id,
                "state": json.loads(row.checkpoint_data),
                "next_nodes": json.loads(row.next_nodes) if row.next_nodes else [],
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        except Exception as exc:
            raise CheckpointError(
                f"Failed to load checkpoint for run '{run_id}': {exc}"
            ) from exc

    # -- listing -------------------------------------------------------------

    async def list_checkpoints(self, run_id: str) -> list[dict]:
        """List all checkpoints for a given run, newest first.

        Args:
            run_id: Workflow run identifier.

        Returns:
            List of checkpoint dictionaries.

        Raises:
            CheckpointError: If the database query fails.
        """
        # In-memory mode (for testing)
        if self._is_memory_mode():
            cursor = self._conn.execute(
                "SELECT run_id, thread_id, workflow_id, checkpoint_data, next_nodes FROM workflow_checkpoints WHERE run_id = ? ORDER BY created_at DESC",
                (run_id,)
            )
            checkpoints = []
            for row in cursor.fetchall():
                checkpoints.append({
                    "run_id": row[0], "thread_id": row[1], "workflow_id": row[2],
                    "state": json.loads(row[3]),
                    "next_nodes": json.loads(row[4]) if row[4] else [],
                })
            return checkpoints

        try:
            from sqlalchemy import text

            result = await self.db.execute(
                text(
                    """
                    SELECT
                        run_id,
                        thread_id,
                        workflow_id,
                        checkpoint_data,
                        next_nodes,
                        created_at
                    FROM workflow_checkpoints
                    WHERE run_id = :run_id
                    ORDER BY created_at DESC
                    """
                ),
                {"run_id": run_id},
            )

            checkpoints: list[dict] = []
            for row in result.mappings().all():
                checkpoints.append(
                    {
                        "run_id": row["run_id"],
                        "thread_id": row["thread_id"],
                        "workflow_id": row["workflow_id"],
                        "state": json.loads(row["checkpoint_data"]),
                        "next_nodes": (
                            json.loads(row["next_nodes"])
                            if row["next_nodes"]
                            else []
                        ),
                        "created_at": (
                            row["created_at"].isoformat()
                            if row["created_at"]
                            else None
                        ),
                    }
                )

            logger.info(
                "Listed %d checkpoint(s) for run '%s'", len(checkpoints), run_id
            )
            return checkpoints

        except Exception as exc:
            raise CheckpointError(
                f"Failed to list checkpoints for run '{run_id}': {exc}"
            ) from exc

    # -- cleanup -------------------------------------------------------------

    async def delete_run_checkpoints(self, run_id: str) -> int:
        """Delete all checkpoints for a run.

        Args:
            run_id: Workflow run identifier.

        Returns:
            Number of deleted checkpoints.
        """
        try:
            # Delete from Redis
            redis_key = self._redis_key(run_id)
            await self.redis.delete(redis_key)

            # Delete from DB
            from sqlalchemy import text

            result = await self.db.execute(
                text("DELETE FROM workflow_checkpoints WHERE run_id = :run_id"),
                {"run_id": run_id},
            )
            await self.db.commit()
            deleted = result.rowcount
            logger.info("Deleted %d checkpoint(s) for run '%s'", deleted, run_id)
            return deleted
        except Exception as exc:
            raise CheckpointError(
                f"Failed to delete checkpoints for run '{run_id}': {exc}"
            ) from exc

    # -- helpers -------------------------------------------------------------

    @staticmethod
    def _redis_key(run_id: str) -> str:
        """Build a Redis key for a run's checkpoint hash."""
        return f"checkpoint:{run_id}"
