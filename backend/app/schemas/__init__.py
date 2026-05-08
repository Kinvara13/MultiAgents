"""Pydantic schemas for AgentNexus.

All schemas use Pydantic v2 with ConfigDict(from_attributes=True)
to enable seamless conversion from SQLAlchemy ORM instances.
"""

from app.schemas.agent import (
    AgentBase,
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
    AgentInvokeRequest,
    AgentInvokeResponse,
)
from app.schemas.workflow import (
    WorkflowBase,
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    WorkflowRunRequest,
    WorkflowRunResponse,
    NodeExecutionResponse,
    WorkflowRunDetailResponse,
)
from app.schemas.artifact import (
    ArtifactBase,
    ArtifactCreate,
    ArtifactUpdate,
    ArtifactResponse,
)

__all__ = [
    # Agent schemas
    "AgentBase",
    "AgentCreate",
    "AgentUpdate",
    "AgentResponse",
    "AgentListResponse",
    "AgentInvokeRequest",
    "AgentInvokeResponse",
    # Workflow schemas
    "WorkflowBase",
    "WorkflowCreate",
    "WorkflowUpdate",
    "WorkflowResponse",
    "WorkflowRunRequest",
    "WorkflowRunResponse",
    "NodeExecutionResponse",
    "WorkflowRunDetailResponse",
    # Artifact schemas
    "ArtifactBase",
    "ArtifactCreate",
    "ArtifactUpdate",
    "ArtifactResponse",
]
