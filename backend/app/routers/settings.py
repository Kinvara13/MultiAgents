"""Settings and monitoring API routes.

Provides endpoints for application settings management, agent and system
metrics, workflow statistics, and log querying.
"""

import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Agent, Workflow, WorkflowRun
from app.schemas import (
    AgentMetricsItem,
    AgentMetricsResponse,
    AppSettingsResponse,
    AppSettingsUpdate,
    LogEntry,
    LogsResponse,
    SystemMetricsResponse,
    WorkflowStatsResponse,
)
from app.config import get_settings

router = APIRouter(prefix="/api/v1", tags=["settings"])

# In-memory settings store (until DB-backed settings are implemented)
_settings_cache: Dict[str, any] = {}


@router.get(
    "/settings",
    response_model=AppSettingsResponse,
    summary="Get settings",
    description="Retrieve current application settings.",
)
async def get_settings() -> AppSettingsResponse:
    """Get current application settings.

    Returns:
        Application settings including workflow engine, agent, and
        WebSocket configuration.
    """
    cfg = get_settings()

    return AppSettingsResponse(
        app_name=cfg.APP_NAME,
        app_version=cfg.APP_VERSION,
        debug=cfg.DEBUG,
        log_level=cfg.LOG_LEVEL,
        workflow_max_execution_time=cfg.WORKFLOW_MAX_EXECUTION_TIME,
        workflow_default_timeout=cfg.WORKFLOW_DEFAULT_TIMEOUT,
        workflow_max_retries=cfg.WORKFLOW_MAX_RETRIES,
        agent_health_check_interval=cfg.AGENT_HEALTH_CHECK_INTERVAL,
        agent_request_timeout=cfg.AGENT_REQUEST_TIMEOUT,
        ws_heartbeat_interval=cfg.WS_HEARTBEAT_INTERVAL,
        **_settings_cache,
    )


@router.put(
    "/settings",
    response_model=AppSettingsResponse,
    summary="Update settings",
    description="Update application settings.",
)
async def update_settings(
    data: AppSettingsUpdate,
) -> AppSettingsResponse:
    """Update application settings.

    Args:
        data: Settings update payload (partial).

    Returns:
        Updated application settings.
    """
    global _settings_cache

    update_data = data.model_dump(exclude_unset=True)
    _settings_cache.update(update_data)

    cfg = get_settings()

    return AppSettingsResponse(
        app_name=cfg.APP_NAME,
        app_version=cfg.APP_VERSION,
        debug=_settings_cache.get("debug", cfg.DEBUG),
        log_level=_settings_cache.get("log_level", cfg.LOG_LEVEL),
        workflow_max_execution_time=_settings_cache.get(
            "workflow_max_execution_time", cfg.WORKFLOW_MAX_EXECUTION_TIME
        ),
        workflow_default_timeout=_settings_cache.get(
            "workflow_default_timeout", cfg.WORKFLOW_DEFAULT_TIMEOUT
        ),
        workflow_max_retries=_settings_cache.get(
            "workflow_max_retries", cfg.WORKFLOW_MAX_RETRIES
        ),
        agent_health_check_interval=_settings_cache.get(
            "agent_health_check_interval", cfg.AGENT_HEALTH_CHECK_INTERVAL
        ),
        agent_request_timeout=_settings_cache.get(
            "agent_request_timeout", cfg.AGENT_REQUEST_TIMEOUT
        ),
        ws_heartbeat_interval=_settings_cache.get(
            "ws_heartbeat_interval", cfg.WS_HEARTBEAT_INTERVAL
        ),
    )


@router.get(
    "/metrics/agents",
    response_model=AgentMetricsResponse,
    summary="Get agent metrics",
    description="Retrieve performance metrics for all registered agents.",
)
async def get_agent_metrics(
    db: AsyncSession = Depends(get_db),
) -> AgentMetricsResponse:
    """Get mock performance metrics for all registered agents.

    Args:
        db: Database session.

    Returns:
        List of agent metrics including average response time,
        task count, and error rate.
    """
    result = await db.execute(
        select(Agent).where(Agent.is_deleted.is_(False)).order_by(Agent.name)
    )
    agents = result.scalars().all()

    metrics: List[AgentMetricsItem] = []
    for agent in agents:
        metrics.append(
            AgentMetricsItem(
                agent_id=agent.id,
                agent_name=agent.name,
                agent_slug=agent.slug,
                avg_response_time_ms=round(random.uniform(120.0, 3500.0), 2),
                task_count=random.randint(0, 5000),
                error_rate=round(random.uniform(0.0, 15.0), 2),
                status=agent.status or "unknown",
            )
        )

    return AgentMetricsResponse(
        metrics=metrics,
        total_agents=len(metrics),
    )


@router.get(
    "/metrics/system",
    response_model=SystemMetricsResponse,
    summary="Get system metrics",
    description="Retrieve current system resource utilization.",
)
async def get_system_metrics() -> SystemMetricsResponse:
    """Get mock system resource metrics.

    Returns:
        Current CPU, memory, and disk utilization percentages.
    """
    return SystemMetricsResponse(
        cpu_percent=round(random.uniform(5.0, 85.0), 1),
        memory_percent=round(random.uniform(20.0, 78.0), 1),
        disk_usage=round(random.uniform(30.0, 92.0), 1),
        load_average=[
            round(random.uniform(0.5, 4.0), 2),
            round(random.uniform(0.5, 3.5), 2),
            round(random.uniform(0.5, 3.0), 2),
        ],
        uptime_seconds=random.randint(3600, 864000),
    )


@router.get(
    "/metrics/workflows",
    response_model=WorkflowStatsResponse,
    summary="Get workflow stats",
    description="Retrieve workflow execution statistics grouped by status.",
)
async def get_workflow_stats(
    db: AsyncSession = Depends(get_db),
) -> WorkflowStatsResponse:
    """Get workflow execution statistics.

    Args:
        db: Database session.

    Returns:
        Workflow counts grouped by status and overall statistics.
    """
    # Count workflows by status
    result = await db.execute(
        select(Workflow.status, func.count())
        .where(Workflow.is_deleted.is_(False))
        .group_by(Workflow.status)
    )
    workflow_status_counts = {row[0]: row[1] for row in result.all()}

    # Count runs by status
    run_result = await db.execute(
        select(WorkflowRun.status, func.count()).group_by(WorkflowRun.status)
    )
    run_status_counts = {row[0]: row[1] for row in run_result.all()}

    # Total counts
    total_workflows_result = await db.execute(
        select(func.count())
        .select_from(Workflow)
        .where(Workflow.is_deleted.is_(False))
    )
    total_workflows = total_workflows_result.scalar_one()

    total_runs_result = await db.execute(select(func.count()).select_from(WorkflowRun))
    total_runs = total_runs_result.scalar_one()

    return WorkflowStatsResponse(
        total_workflows=total_workflows,
        total_runs=total_runs,
        workflow_status_counts=workflow_status_counts,
        run_status_counts=run_status_counts,
    )


@router.get(
    "/logs",
    response_model=LogsResponse,
    summary="Get logs",
    description="Query application logs with filtering.",
)
async def get_logs(
    level: Optional[str] = Query(None, description="Filter by log level (DEBUG, INFO, WARN, ERROR)"),
    source: Optional[str] = Query(None, description="Filter by log source"),
    start_time: Optional[datetime] = Query(None, description="Start of time range (ISO 8601)"),
    end_time: Optional[datetime] = Query(None, description="End of time range (ISO 8601)"),
    search: Optional[str] = Query(None, description="Search in log messages"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum records to return"),
) -> LogsResponse:
    """Query application logs with filtering.

    Returns mock log entries since logs are typically stored in external
    systems (e.g., Loki, ELK). This endpoint demonstrates the filtering API.

    Args:
        level: Filter by log level.
        source: Filter by log source component.
        start_time: Start of time range.
        end_time: End of time range.
        search: Free-text search in log messages.
        skip: Pagination offset.
        limit: Pagination page size.

    Returns:
        Filtered list of log entries.
    """
    levels = ["DEBUG", "INFO", "WARN", "ERROR"]
    sources = [
        "workflow_engine",
        "agent_adapter",
        "http_server",
        "websocket",
        "scheduler",
        "storage",
    ]
    messages = [
        "Workflow execution started for workflow-{id}",
        "Node {node} completed in {ms}ms",
        "Agent {agent} invoked successfully",
        "Connection pool exhausted, waiting for available connection",
        "Retry attempt {n} for task {task}",
        "WebSocket client connected from {ip}",
        "Artifact uploaded: {name} ({size} bytes)",
        "DAG validation failed: cycle detected at node {node}",
        "Health check passed for agent {agent}",
        "Rate limit applied to client {client}",
    ]

    entries: List[LogEntry] = []
    now = datetime.utcnow()

    for i in range(min(limit, 100)):
        entry_level = random.choice(levels)
        entry_source = random.choice(sources)
        entry_time = now - timedelta(seconds=random.randint(0, 86400))

        # Apply level filter
        if level and entry_level != level.upper():
            continue

        # Apply source filter
        if source and entry_source != source:
            continue

        # Apply time range filter
        if start_time and entry_time < start_time:
            continue
        if end_time and entry_time > end_time:
            continue

        message = random.choice(messages).format(
            id=f"wf-{random.randint(1000, 9999)}",
            node=f"node-{random.randint(1, 20)}",
            ms=random.randint(5, 5000),
            agent=f"agent-{random.randint(1, 10)}",
            n=random.randint(1, 3),
            task=f"task-{random.randint(100, 999)}",
            ip=f"192.168.{random.randint(0, 255)}.{random.randint(0, 255)}",
            name=f"artifact-{random.randint(1, 100)}.txt",
            size=random.randint(100, 1000000),
            client=f"client-{random.randint(1, 50)}",
        )

        # Apply search filter
        if search and search.lower() not in message.lower():
            continue

        entries.append(
            LogEntry(
                timestamp=entry_time,
                level=entry_level,
                source=entry_source,
                message=message,
                trace_id=f"trace-{random.randint(100000, 999999):06x}",
            )
        )

    return LogsResponse(
        entries=entries,
        total=len(entries),
        skip=skip,
        limit=limit,
    )
