"""Execution control API routes.

Provides endpoints for monitoring and controlling workflow executions,
including run status, pause/resume/cancel, real-time logs via SSE,
and checkpoint retrieval.
"""

import asyncio
from datetime import datetime
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import NodeExecution, WorkflowRun
from app.schemas import (
    CheckpointListResponse,
    NodeExecutionItem,
    RunDetailResponse,
    RunStatusResponse,
)

router = APIRouter(prefix="/api/v1", tags=["executions"])

# Valid state transitions for workflow runs
_VALID_TRANSITIONS = {
    "pending": ["running", "cancelled"],
    "running": ["paused", "completed", "failed", "cancelled"],
    "paused": ["running", "cancelled"],
    "completed": [],
    "failed": [],
    "cancelled": [],
}


@router.get(
    "/runs/{id}",
    response_model=RunDetailResponse,
    summary="Get run detail",
    description="Retrieve detailed information about a workflow run, including node executions.",
)
async def get_run_detail(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> RunDetailResponse:
    """Get detailed information about a workflow run.

    Args:
        id: The workflow run's unique identifier.
        db: Database session.

    Returns:
        Run details including workflow reference and node executions.

    Raises:
        HTTPException: 404 if run not found.
    """
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{id}' not found",
        )

    # Fetch associated node executions
    node_result = await db.execute(
        select(NodeExecution)
        .where(NodeExecution.workflow_run_id == id)
        .order_by(NodeExecution.started_at)
    )
    nodes = node_result.scalars().all()

    return RunDetailResponse(
        id=run.id,
        workflow_id=run.workflow_id,
        status=run.status,
        input_data=run.input_data or {},
        output_data=run.output_data or {},
        trigger=run.trigger,
        started_at=run.started_at,
        completed_at=run.completed_at,
        created_at=run.created_at,
        updated_at=run.updated_at,
        node_executions=[
            NodeExecutionItem(
                id=n.id,
                node_id=n.node_id,
                node_name=n.node_name,
                status=n.status,
                started_at=n.started_at,
                completed_at=n.completed_at,
                duration_ms=n.duration_ms,
                output=n.output,
                error=n.error,
            )
            for n in nodes
        ],
    )


@router.post(
    "/runs/{id}/pause",
    response_model=RunStatusResponse,
    summary="Pause run",
    description="Pause a running workflow run.",
)
async def pause_run(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> RunStatusResponse:
    """Pause a running workflow run.

    Args:
        id: The workflow run's unique identifier.
        db: Database session.

    Returns:
        Updated run status.

    Raises:
        HTTPException: 404 if run not found, 409 if run cannot be paused.
    """
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{id}' not found",
        )

    if "paused" not in _VALID_TRANSITIONS.get(run.status, []):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot pause run in '{run.status}' state",
        )

    run.status = "paused"
    run.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(run)

    return RunStatusResponse(
        run_id=run.id,
        status=run.status,
        message="Run paused successfully",
    )


@router.post(
    "/runs/{id}/resume",
    response_model=RunStatusResponse,
    summary="Resume run",
    description="Resume a paused workflow run.",
)
async def resume_run(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> RunStatusResponse:
    """Resume a paused workflow run.

    Args:
        id: The workflow run's unique identifier.
        db: Database session.

    Returns:
        Updated run status.

    Raises:
        HTTPException: 404 if run not found, 409 if run cannot be resumed.
    """
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{id}' not found",
        )

    if "running" not in _VALID_TRANSITIONS.get(run.status, []):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot resume run in '{run.status}' state",
        )

    run.status = "running"
    run.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(run)

    return RunStatusResponse(
        run_id=run.id,
        status=run.status,
        message="Run resumed successfully",
    )


@router.post(
    "/runs/{id}/cancel",
    response_model=RunStatusResponse,
    summary="Cancel run",
    description="Cancel a pending or running workflow run.",
)
async def cancel_run(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> RunStatusResponse:
    """Cancel a workflow run.

    Args:
        id: The workflow run's unique identifier.
        db: Database session.

    Returns:
        Updated run status.

    Raises:
        HTTPException: 404 if run not found, 409 if run cannot be cancelled.
    """
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{id}' not found",
        )

    if "cancelled" not in _VALID_TRANSITIONS.get(run.status, []):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel run in '{run.status}' state",
        )

    run.status = "cancelled"
    run.updated_at = datetime.utcnow()
    if not run.completed_at:
        run.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(run)

    return RunStatusResponse(
        run_id=run.id,
        status=run.status,
        message="Run cancelled successfully",
    )


async def _generate_run_logs(run_id: str) -> AsyncGenerator[str, None]:
    """Generate Server-Sent Events for workflow run logs.

    Simulates a real-time log stream with node execution events.

    Args:
        run_id: The workflow run identifier.

    Yields:
        SSE-formatted event strings.
    """
    events = [
        {"type": "log", "level": "INFO", "message": f"Workflow run {run_id} started"},
        {"type": "log", "level": "INFO", "message": "Initializing node executions"},
        {"type": "log", "level": "DEBUG", "message": "Loading workflow definition"},
        {"type": "log", "level": "INFO", "message": "Executing node: input_validation"},
        {"type": "log", "level": "DEBUG", "message": "Node input_validation completed in 12ms"},
        {"type": "log", "level": "INFO", "message": "Executing node: agent_dispatch"},
        {"type": "log", "level": "INFO", "message": "Agent claude-3 accepted task"},
        {"type": "log", "level": "DEBUG", "message": "Streaming agent response..."},
        {"type": "log", "level": "INFO", "message": "Agent response received (2.4k tokens)"},
        {"type": "log", "level": "INFO", "message": "Executing node: output_format"},
        {"type": "log", "level": "DEBUG", "message": "Formatting output as markdown"},
        {"type": "log", "level": "INFO", "message": "Workflow run completed successfully"},
    ]

    for event in events:
        event["timestamp"] = datetime.utcnow().isoformat()
        yield f"data: {__import__('json').dumps(event)}\n\n"
        await asyncio.sleep(0.3)

    yield f"data: {__import__('json').dumps({'type': 'done', 'timestamp': datetime.utcnow().isoformat()})}\n\n"


@router.get(
    "/runs/{id}/logs",
    summary="Get run logs (SSE)",
    description="Stream workflow run logs via Server-Sent Events.",
)
async def get_run_logs(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream workflow run logs via Server-Sent Events.

    Args:
        id: The workflow run's unique identifier.
        db: Database session.

    Returns:
        SSE stream of log events.

    Raises:
        HTTPException: 404 if run not found.
    """
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{id}' not found",
        )

    return StreamingResponse(
        _generate_run_logs(id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/runs/{id}/checkpoints",
    response_model=CheckpointListResponse,
    summary="Get checkpoints",
    description="Retrieve execution checkpoints for a workflow run.",
)
async def get_checkpoints(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> CheckpointListResponse:
    """Get checkpoints for a workflow run.

    Checkpoints represent saved states at various points during execution,
    useful for resuming from a specific point.

    Args:
        id: The workflow run's unique identifier.
        db: Database session.

    Returns:
        List of checkpoints for the run.

    Raises:
        HTTPException: 404 if run not found.
    """
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{id}' not found",
        )

    # Fetch node executions as checkpoint data
    node_result = await db.execute(
        select(NodeExecution)
        .where(NodeExecution.workflow_run_id == id)
        .order_by(NodeExecution.started_at)
    )
    nodes = node_result.scalars().all()

    checkpoints = []
    for node in nodes:
        checkpoints.append(
            {
                "id": f"chk-{node.id}",
                "node_id": node.node_id,
                "node_name": node.node_name,
                "status": node.status,
                "created_at": node.started_at.isoformat() if node.started_at else None,
                "data": {
                    "output": node.output,
                    "error": node.error,
                    "duration_ms": node.duration_ms,
                },
            }
        )

    return CheckpointListResponse(
        run_id=id,
        checkpoints=checkpoints,
        total=len(checkpoints),
    )
