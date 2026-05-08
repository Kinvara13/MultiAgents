"""Agent management API routes.

Provides CRUD operations for AI agents, connection testing, and task invocation
endpoints for all registered agent types.
"""

import asyncio
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Agent
from app.schemas import (
    AgentCreate,
    AgentInvokeRequest,
    AgentInvokeResponse,
    AgentListResponse,
    AgentResponse,
    AgentUpdate,
    TestConnectionResponse,
)

router = APIRouter(prefix="/api/v1", tags=["agents"])


@router.get(
    "/agents",
    response_model=AgentListResponse,
    summary="List agents",
    description="Retrieve a paginated list of agents with optional filtering.",
)
async def list_agents(
    type: Optional[str] = Query(None, description="Filter by agent type"),
    status: Optional[str] = Query(None, description="Filter by agent status"),
    capability: Optional[str] = Query(None, description="Filter by capability"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    db: AsyncSession = Depends(get_db),
) -> AgentListResponse:
    """List agents with optional filtering and pagination.

    Args:
        type: Filter by agent type.
        status: Filter by agent status.
        capability: Filter by capability.
        search: Free-text search across name and description.
        skip: Pagination offset.
        limit: Pagination page size.
        db: Database session.

    Returns:
        Paginated list of agents with total count.
    """
    query = select(Agent).where(Agent.is_deleted.is_(False))

    if type:
        query = query.where(Agent.type == type)
    if status:
        query = query.where(Agent.status == status)
    if capability:
        query = query.where(Agent.capabilities.contains([capability]))
    if search:
        query = query.where(
            Agent.name.ilike(f"%{search}%") | Agent.description.ilike(f"%{search}%")
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(Agent.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return AgentListResponse(
        items=list(items),
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/agents",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create agent",
    description="Register a new AI agent.",
)
async def create_agent(
    data: AgentCreate,
    db: AsyncSession = Depends(get_db),
) -> Agent:
    """Create a new agent.

    Args:
        data: Agent creation payload.
        db: Database session.

    Returns:
        The newly created agent.

    Raises:
        HTTPException: 400 if agent with given slug already exists.
    """
    existing = await db.execute(select(Agent).where(Agent.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent with slug '{data.slug}' already exists",
        )

    agent = Agent(**data.model_dump())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.get(
    "/agents/{id}",
    response_model=AgentResponse,
    summary="Get agent",
    description="Retrieve a single agent by its ID.",
)
async def get_agent(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> Agent:
    """Get an agent by ID.

    Args:
        id: The agent's unique identifier.
        db: Database session.

    Returns:
        The requested agent.

    Raises:
        HTTPException: 404 if agent not found.
    """
    result = await db.execute(
        select(Agent).where(Agent.id == id, Agent.is_deleted.is_(False))
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{id}' not found",
        )
    return agent


@router.put(
    "/agents/{id}",
    response_model=AgentResponse,
    summary="Update agent",
    description="Update an existing agent.",
)
async def update_agent(
    id: str,
    data: AgentUpdate,
    db: AsyncSession = Depends(get_db),
) -> Agent:
    """Update an agent by ID.

    Args:
        id: The agent's unique identifier.
        data: Agent update payload (partial).
        db: Database session.

    Returns:
        The updated agent.

    Raises:
        HTTPException: 404 if agent not found.
    """
    result = await db.execute(
        select(Agent).where(Agent.id == id, Agent.is_deleted.is_(False))
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{id}' not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)

    await db.commit()
    await db.refresh(agent)
    return agent


@router.delete(
    "/agents/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete agent",
    description="Soft-delete an agent.",
)
async def delete_agent(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete an agent by ID.

    Args:
        id: The agent's unique identifier.
        db: Database session.

    Raises:
        HTTPException: 404 if agent not found.
    """
    result = await db.execute(
        select(Agent).where(Agent.id == id, Agent.is_deleted.is_(False))
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{id}' not found",
        )

    agent.is_deleted = True
    agent.status = "deleted"
    await db.commit()


@router.post(
    "/agents/{id}/test",
    response_model=TestConnectionResponse,
    summary="Test agent connection",
    description="Perform a health-check against the agent endpoint.",
)
async def test_connection(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> TestConnectionResponse:
    """Test connectivity to an agent.

    Simulates a health-check by sleeping for 1 second and returning
    a random success/failure status.

    Args:
        id: The agent's unique identifier.
        db: Database session.

    Returns:
        Connection test result with status.

    Raises:
        HTTPException: 404 if agent not found.
    """
    result = await db.execute(
        select(Agent).where(Agent.id == id, Agent.is_deleted.is_(False))
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{id}' not found",
        )

    await asyncio.sleep(1.0)

    import random

    is_connected = random.random() > 0.1  # 90% success rate
    return TestConnectionResponse(
        agent_id=id,
        status="connected" if is_connected else "failed",
        message="Connection established" if is_connected else "Connection timeout",
    )


@router.post(
    "/agents/{id}/invoke",
    response_model=AgentInvokeResponse,
    summary="Invoke agent",
    description="Send a task to an agent and receive a mocked response.",
)
async def invoke_agent(
    id: str,
    request: AgentInvokeRequest,
    db: AsyncSession = Depends(get_db),
) -> AgentInvokeResponse:
    """Invoke an agent to process a task.

    Simulates AI agent processing with a random delay (1-3s) and returns
    a response tailored to the agent's slug.

    Args:
        id: The agent's unique identifier.
        request: Invocation request with task description and variables.
        db: Database session.

    Returns:
        Agent invocation result with output, tokens used, and duration.

    Raises:
        HTTPException: 404 if agent not found.
    """
    result = await db.execute(
        select(Agent).where(Agent.id == id, Agent.is_deleted.is_(False))
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{id}' not found",
        )

    import random

    start_time = time.perf_counter()
    delay = random.uniform(1.0, 3.0)
    await asyncio.sleep(delay)
    elapsed_ms = int((time.perf_counter() - start_time) * 1000)

    slug = agent.slug.lower()
    task = request.task_description
    variables = request.input_variables or {}

    if slug == "claude":
        output = (
            f"## Analysis: {task}\n\n"
            f"I've carefully reviewed the provided context. Here are my findings:\n\n"
            f"1. **Key Insight**: The primary objective revolves around "
            f"{list(variables.keys())[0] if variables else 'the core problem'}.\n"
            f"2. **Reasoning**: By examining the relationships between the given variables, "
            f"a pattern emerges that suggests a structured approach.\n"
            f"3. **Conclusion**: The optimal path forward involves iterative refinement "
            f"with continuous validation of intermediate results.\n\n"
            f"*Analysis completed in {elapsed_ms}ms*"
        )
        tokens_used = random.randint(800, 2500)

    elif slug == "codex":
        var_str = ", ".join(f"{k}={v}" for k, v in variables.items())
        output = (
            f"```python\n"
            f"def solve_{task.lower().replace(' ', '_')}({', '.join(variables.keys())}):\n"
            f"    \"\"\"\n"
            f"    {task}\n"
            f"    Args: {var_str}\n"
            f"    \"\"\"\n"
            f"    result = process({', '.join(variables.keys())})\n"
            f"    return validate(result)\n"
            f"\n"
            f"# Usage\n"
            f"output = solve_{task.lower().replace(' ', '_')}({var_str})\n"
            f"print(f'Result: {{output}}')\n"
            f"```\n\n"
            f"_Generated {random.randint(20, 80)} lines of code_"
        )
        tokens_used = random.randint(400, 1200)

    elif slug == "trae":
        output = (
            f"## Test Results: {task}\n\n"
            f"| Test Case | Status | Duration |\n"
            f"|-----------|--------|----------|\n"
            f"| test_basic_flow | PASS | 12ms |\n"
            f"| test_edge_cases | PASS | 24ms |\n"
            f"| test_concurrent_load | PASS | 156ms |\n"
            f"| test_error_handling | PASS | 8ms |\n"
            f"| test_integration | PASS | 342ms |\n\n"
            f"**Coverage**: {random.randint(85, 99)}.%\n"
            f"**Total**: 5 passed, 0 failed in {elapsed_ms}ms"
        )
        tokens_used = random.randint(300, 800)

    elif slug == "openclaw":
        output = (
            f"## Search Results: '{task}'\n\n"
            f"Found {random.randint(3, 12)} results:\n\n"
            f"1. **[Official Documentation]** {task} - Comprehensive guide "
            f"with examples and best practices.\n"
            f"2. **[GitHub Repository]** Popular open-source implementation "
            f"with {random.randint(1000, 15000)} stars.\n"
            f"3. **[Research Paper]** Recent advances in {task} published 2024.\n"
            f"4. **[Tutorial]** Step-by-step walkthrough for beginners.\n"
            f"5. **[Community Discussion]** Stack Overflow thread with accepted solutions.\n\n"
            f"*Search completed in {elapsed_ms}ms*"
        )
        tokens_used = random.randint(500, 1500)

    elif slug == "hermes":
        output = (
            f"## Routing Confirmation\n\n"
            f"Task **'{task}'** has been analyzed and routed.\n\n"
            f"- **Primary Agent**: {agent.name}\n"
            f"- **Confidence**: {random.randint(85, 99)}%\n"
            f"- **Target Queue**: high-priority\n"
            f"- **Estimated Completion**: {random.randint(10, 120)}s\n"
            f"- **Variables Received**: {len(variables)}\n\n"
            f"Routing decision based on task pattern matching and "
            f"agent availability. No manual intervention required."
        )
        tokens_used = random.randint(200, 600)

    elif slug == "cursor":
        output = (
            f"## Code Suggestions\n\n"
            f"For task **'{task}'**, here are the recommended changes:\n\n"
            f"```diff\n"
            f"+ def optimized_{task.lower().replace(' ', '_')}(data):\n"
            f"+     \"\"\"Efficient implementation\"\"\"\n"
            f"+     processed = [transform(x) for x in data]\n"
            f"+     return aggregate(processed)\n"
            f"```\n\n"
            f"**Suggested imports**: `from utils import transform, aggregate`\n"
            f"**Refactoring opportunity**: Extract method pattern applicable\n"
            f"**Type hints**: Add `-> List[Result]` for clarity\n\n"
            f"*Analyzed {random.randint(50, 500)} lines of context*"
        )
        tokens_used = random.randint(350, 900)

    else:
        output = (
            f"Processed task: {task}\n"
            f"Variables: {variables}\n"
            f"Result: Task completed successfully by {agent.name}."
        )
        tokens_used = random.randint(100, 500)

    return AgentInvokeResponse(
        agent_id=id,
        task_description=request.task_description,
        output=output,
        tokens_used=tokens_used,
        duration_ms=elapsed_ms,
        model_config=request.model_config or {},
    )
