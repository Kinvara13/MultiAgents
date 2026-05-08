"""Workflow management API routes.

Provides CRUD operations for workflows, workflow validation (DAG cycle
detection), execution queuing, and run history retrieval.
"""

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import NodeExecution, Workflow, WorkflowRun
from app.schemas import (
    WorkflowCreate,
    WorkflowListResponse,
    WorkflowResponse,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowRunsListResponse,
    WorkflowUpdate,
    WorkflowValidationResult,
)

router = APIRouter(prefix="/api/v1", tags=["workflows"])


@router.get(
    "/workflows",
    response_model=WorkflowListResponse,
    summary="List workflows",
    description="Retrieve a paginated list of workflows with optional filtering.",
)
async def list_workflows(
    status: Optional[str] = Query(None, description="Filter by workflow status"),
    is_template: Optional[bool] = Query(None, description="Filter by template flag"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    db: AsyncSession = Depends(get_db),
) -> WorkflowListResponse:
    """List workflows with optional filtering and pagination.

    Args:
        status: Filter by workflow status.
        is_template: Filter by template flag.
        search: Free-text search across name and description.
        skip: Pagination offset.
        limit: Pagination page size.
        db: Database session.

    Returns:
        Paginated list of workflows with total count.
    """
    query = select(Workflow).where(Workflow.is_deleted.is_(False))

    if status:
        query = query.where(Workflow.status == status)
    if is_template is not None:
        query = query.where(Workflow.is_template == is_template)
    if search:
        query = query.where(
            Workflow.name.ilike(f"%{search}%")
            | Workflow.description.ilike(f"%{search}%")
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(Workflow.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return WorkflowListResponse(
        items=list(items),
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/workflows",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create workflow",
    description="Create a new workflow definition.",
)
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
) -> Workflow:
    """Create a new workflow.

    Args:
        data: Workflow creation payload.
        db: Database session.

    Returns:
        The newly created workflow.

    Raises:
        HTTPException: 400 if workflow name already exists.
    """
    existing = await db.execute(
        select(Workflow).where(
            Workflow.name == data.name, Workflow.is_deleted.is_(False)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workflow with name '{data.name}' already exists",
        )

    workflow = Workflow(**data.model_dump())
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return workflow


@router.get(
    "/workflows/{id}",
    response_model=WorkflowResponse,
    summary="Get workflow",
    description="Retrieve a single workflow by its ID.",
)
async def get_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> Workflow:
    """Get a workflow by ID.

    Args:
        id: The workflow's unique identifier.
        db: Database session.

    Returns:
        The requested workflow.

    Raises:
        HTTPException: 404 if workflow not found.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == id, Workflow.is_deleted.is_(False))
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{id}' not found",
        )
    return workflow


@router.put(
    "/workflows/{id}",
    response_model=WorkflowResponse,
    summary="Update workflow",
    description="Update an existing workflow definition.",
)
async def update_workflow(
    id: str,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
) -> Workflow:
    """Update a workflow by ID.

    Args:
        id: The workflow's unique identifier.
        data: Workflow update payload (partial).
        db: Database session.

    Returns:
        The updated workflow.

    Raises:
        HTTPException: 404 if workflow not found.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == id, Workflow.is_deleted.is_(False))
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{id}' not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workflow, field, value)

    await db.commit()
    await db.refresh(workflow)
    return workflow


@router.delete(
    "/workflows/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete workflow",
    description="Soft-delete a workflow.",
)
async def delete_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete a workflow by ID.

    Args:
        id: The workflow's unique identifier.
        db: Database session.

    Raises:
        HTTPException: 404 if workflow not found.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == id, Workflow.is_deleted.is_(False))
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{id}' not found",
        )

    workflow.is_deleted = True
    workflow.status = "deleted"
    await db.commit()


@router.post(
    "/workflows/{id}/run",
    response_model=WorkflowRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Run workflow",
    description="Queue a workflow for execution.",
)
async def run_workflow(
    id: str,
    request: WorkflowRunRequest,
    db: AsyncSession = Depends(get_db),
) -> WorkflowRunResponse:
    """Queue a workflow for execution.

    Creates a WorkflowRun record with status "pending" and returns
    the run details. Actual execution is handled by the workflow engine.

    Args:
        id: The workflow's unique identifier.
        request: Workflow run request with input data.
        db: Database session.

    Returns:
        Workflow run details indicating the workflow has been queued.

    Raises:
        HTTPException: 404 if workflow not found.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == id, Workflow.is_deleted.is_(False))
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{id}' not found",
        )

    run = WorkflowRun(
        id=str(uuid.uuid4()),
        workflow_id=id,
        status="pending",
        input_data=request.input_data or {},
        trigger=request.trigger or "manual",
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    return WorkflowRunResponse(
        run_id=run.id,
        workflow_id=id,
        status="pending",
        message="Workflow queued for execution",
    )


@router.post(
    "/workflows/{id}/validate",
    response_model=WorkflowValidationResult,
    summary="Validate workflow",
    description="Validate workflow definition for DAG correctness (cycle detection).",
)
async def validate_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> WorkflowValidationResult:
    """Validate a workflow definition.

    Parses the workflow definition (nodes and edges) and checks for
    cycles using depth-first search (DFS).

    Args:
        id: The workflow's unique identifier.
        db: Database session.

    Returns:
        Validation result with valid flag and any error messages.

    Raises:
        HTTPException: 404 if workflow not found.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == id, Workflow.is_deleted.is_(False))
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{id}' not found",
        )

    definition: Dict[str, Any] = workflow.definition or {}
    nodes: List[Dict[str, Any]] = definition.get("nodes", [])
    edges: List[Dict[str, Any]] = definition.get("edges", [])
    errors: List[str] = []

    # Validate nodes exist
    if not nodes:
        errors.append("Workflow has no nodes")
        return WorkflowValidationResult(valid=False, errors=errors)

    # Build adjacency list
    node_ids = {n.get("id") for n in nodes if n.get("id")}
    adjacency: Dict[str, List[str]] = {nid: [] for nid in node_ids}

    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source in adjacency and target in adjacency:
            adjacency[source].append(target)

    # Check for references to non-existent nodes
    for edge in edges:
        if edge.get("source") not in node_ids:
            errors.append(f"Edge references non-existent source node: {edge.get('source')}")
        if edge.get("target") not in node_ids:
            errors.append(f"Edge references non-existent target node: {edge.get('target')}")

    # DFS cycle detection
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in node_ids}

    def _dfs(node_id: str, path: List[str]) -> bool:
        color[node_id] = GRAY
        for neighbor in adjacency.get(node_id, []):
            if color.get(neighbor) == GRAY:
                cycle_nodes = path[path.index(neighbor):] + [neighbor]
                errors.append(
                    f"Cycle detected: {' -> '.join(cycle_nodes)}"
                )
                return True
            if color.get(neighbor) == WHITE:
                if _dfs(neighbor, path + [neighbor]):
                    return True
        color[node_id] = BLACK
        return False

    has_cycle = False
    for nid in node_ids:
        if color[nid] == WHITE:
            if _dfs(nid, [nid]):
                has_cycle = True

    # Check for disconnected nodes
    if edges:
        connected = set()
        for edge in edges:
            connected.add(edge.get("source"))
            connected.add(edge.get("target"))
        disconnected = node_ids - connected
        if disconnected:
            errors.append(f"Disconnected nodes (no edges): {', '.join(disconnected)}")

    valid = not has_cycle and len(errors) == 0

    return WorkflowValidationResult(
        valid=valid,
        errors=errors,
        node_count=len(nodes),
        edge_count=len(edges),
    )


@router.get(
    "/workflows/{id}/runs",
    response_model=WorkflowRunsListResponse,
    summary="Get workflow runs",
    description="Retrieve execution history for a specific workflow.",
)
async def get_workflow_runs(
    id: str,
    status: Optional[str] = Query(None, description="Filter by run status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    db: AsyncSession = Depends(get_db),
) -> WorkflowRunsListResponse:
    """Get all runs for a specific workflow.

    Args:
        id: The workflow's unique identifier.
        status: Filter by run status.
        skip: Pagination offset.
        limit: Pagination page size.
        db: Database session.

    Returns:
        Paginated list of workflow runs.

    Raises:
        HTTPException: 404 if workflow not found.
    """
    workflow_result = await db.execute(
        select(Workflow).where(Workflow.id == id, Workflow.is_deleted.is_(False))
    )
    if not workflow_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{id}' not found",
        )

    query = select(WorkflowRun).where(WorkflowRun.workflow_id == id)

    if status:
        query = query.where(WorkflowRun.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = (
        query.order_by(WorkflowRun.created_at.desc()).offset(skip).limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return WorkflowRunsListResponse(
        items=list(items),
        total=total,
        skip=skip,
        limit=limit,
    )
