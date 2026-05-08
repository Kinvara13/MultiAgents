"""Pydantic schemas for the Workflow and WorkflowRun models.

Schemas cover workflow CRUD, execution management, and detailed run views
including node-level execution results.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ───────────────────────────────────────────────
# Shared field definitions
# ───────────────────────────────────────────────

SLUG_PATTERN = r"^[a-z0-9_\-]{1,128}$"
SEMVER_PATTERN = r"^\d+\.\d+\.\d+(?:-[a-zA-Z0-9._-]+)?$"


# ───────────────────────────────────────────────
# Workflow Base Schemas
# ───────────────────────────────────────────────


class WorkflowBase(BaseModel):
    """Base schema with shared workflow fields.

    Attributes:
        name: Human-readable workflow name.
        slug: URL-safe unique identifier.
        description: Human-readable description.
        definition: DAG definition with nodes and edges.
        trigger_type: How the workflow is triggered.
        trigger_config: Trigger-specific configuration.
    """

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    name: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Human-readable workflow name",
        examples=["Code Review Pipeline", "Document Generation"],
    )
    slug: str = Field(
        ...,
        min_length=1,
        max_length=128,
        pattern=SLUG_PATTERN,
        description="URL-safe unique identifier (e.g., 'code-review')",
        examples=["code-review", "doc-generation"],
    )
    description: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Human-readable description of the workflow",
        examples=["Automated code review with multiple AI agents"],
    )
    definition: dict[str, Any] = Field(
        ...,
        description="DAG definition: {nodes: [...], edges: [...]}",
        examples=[
            {
                "nodes": [
                    {"id": "parse", "type": "agent", "agent": "claude"},
                    {"id": "review", "type": "agent", "agent": "gpt-4"},
                ],
                "edges": [
                    {"from": "parse", "to": "review"},
                ],
            }
        ],
    )
    trigger_type: Optional[str] = Field(
        default=None,
        pattern=r"^(manual|schedule|webhook|event)$",
        description="Trigger type: 'manual', 'schedule', 'webhook', 'event'",
        examples=["manual", "webhook"],
    )
    trigger_config: dict[str, Any] = Field(
        default_factory=dict,
        description="Trigger-specific configuration",
        examples=[{"cron": "0 9 * * *"}],
    )

    @field_validator("slug")
    @classmethod
    def slug_to_lowercase(cls, v: str) -> str:
        """Normalize slug to lowercase."""
        return v.lower()


# ───────────────────────────────────────────────
# Workflow Request Schemas (Create / Update)
# ───────────────────────────────────────────────


class WorkflowCreate(WorkflowBase):
    """Schema for creating a new workflow.

    Extends WorkflowBase with optional fields that have defaults.
    """

    version: str = Field(
        default="1.0.0",
        pattern=SEMVER_PATTERN,
        description="Semantic version string",
        examples=["1.0.0", "2.1.0-beta"],
    )
    is_template: bool = Field(
        default=False,
        description="Whether this workflow is a reusable template",
    )
    status: str = Field(
        default="draft",
        pattern=r"^(draft|published|archived)$",
        description="Publication status: 'draft', 'published', 'archived'",
    )
    owner_id: str = Field(
        default="system",
        max_length=64,
        description="Identifier of the workflow owner",
    )


class WorkflowUpdate(BaseModel):
    """Schema for updating an existing workflow.

    All fields are optional — only provided fields will be updated.
    """

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Human-readable workflow name",
    )
    slug: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        pattern=SLUG_PATTERN,
        description="URL-safe unique identifier",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Human-readable description",
    )
    version: Optional[str] = Field(
        default=None,
        pattern=SEMVER_PATTERN,
        description="Semantic version string",
    )
    definition: Optional[dict[str, Any]] = Field(
        default=None,
        description="DAG definition: {nodes: [...], edges: [...]}",
    )
    status: Optional[str] = Field(
        default=None,
        pattern=r"^(draft|published|archived)$",
        description="Publication status: 'draft', 'published', 'archived'",
    )
    is_template: Optional[bool] = Field(
        default=None,
        description="Whether this workflow is a reusable template",
    )
    trigger_type: Optional[str] = Field(
        default=None,
        pattern=r"^(manual|schedule|webhook|event)$",
        description="Trigger type: 'manual', 'schedule', 'webhook', 'event'",
    )
    trigger_config: Optional[dict[str, Any]] = Field(
        default=None,
        description="Trigger-specific configuration",
    )

    @field_validator("slug")
    @classmethod
    def slug_to_lowercase(cls, v: Optional[str]) -> Optional[str]:
        """Normalize slug to lowercase."""
        if v is not None:
            return v.lower()
        return v


# ───────────────────────────────────────────────
# Workflow Response Schemas
# ───────────────────────────────────────────────


class WorkflowResponse(WorkflowBase):
    """Schema for workflow responses (read operations).

    Includes all fields from the workflow record.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Unique workflow identifier")
    version: str = Field(..., description="Semantic version string")
    status: str = Field(..., description="Publication status")
    is_template: bool = Field(..., description="Whether this is a template")
    owner_id: str = Field(..., description="Workflow owner identifier")
    run_count: int = Field(
        default=0,
        ge=0,
        description="Total number of executions",
    )
    success_count: int = Field(
        default=0,
        ge=0,
        description="Number of successful executions",
    )
    fail_count: int = Field(
        default=0,
        ge=0,
        description="Number of failed executions",
    )
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Record last-update timestamp")


# ───────────────────────────────────────────────
# Workflow Execution Schemas
# ───────────────────────────────────────────────


class WorkflowRunRequest(BaseModel):
    """Schema for triggering a workflow execution.

    Attributes:
        inputs: Input parameters passed to the workflow.
        thread_id: Optional session identifier for grouping related runs.
    """

    model_config = ConfigDict(from_attributes=True)

    inputs: dict[str, Any] = Field(
        default_factory=dict,
        description="Input parameters for the workflow run",
        examples=[{"code": "def hello(): pass", "language": "python"}],
    )
    thread_id: Optional[UUID] = Field(
        default=None,
        description="Session identifier for grouping related runs",
    )


class WorkflowRunResponse(BaseModel):
    """Schema for workflow run trigger responses.

    Returned immediately after a workflow run is initiated.
    """

    model_config = ConfigDict(from_attributes=True)

    run_id: UUID = Field(..., description="Unique run identifier")
    workflow_id: UUID = Field(..., description="Parent workflow identifier")
    thread_id: UUID = Field(..., description="Session isolation identifier")
    status: str = Field(
        ...,
        description="Execution status: 'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'",
    )
    inputs: dict[str, Any] = Field(
        default_factory=dict,
        description="Input parameters for this run",
    )
    started_at: Optional[datetime] = Field(
        default=None,
        description="When execution began",
    )
    created_at: datetime = Field(..., description="Record creation timestamp")


# ───────────────────────────────────────────────
# Node Execution Schemas
# ───────────────────────────────────────────────


class NodeExecutionResponse(BaseModel):
    """Schema for node execution responses.

    Represents the execution result of a single node within a workflow run.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Unique node execution identifier")
    run_id: UUID = Field(..., description="Parent workflow run identifier")
    node_id: str = Field(..., description="Workflow node ID from DAG definition")
    agent_id: Optional[UUID] = Field(
        default=None,
        description="Agent that executed this node",
    )
    agent_name: Optional[str] = Field(
        default=None,
        description="Cached agent name at execution time",
    )
    status: str = Field(
        ...,
        description="Execution status: 'pending', 'running', 'completed', 'failed', 'skipped', 'retrying'",
    )
    inputs: Optional[dict[str, Any]] = Field(
        default=None,
        description="Input data passed to the node",
    )
    outputs: Optional[dict[str, Any]] = Field(
        default=None,
        description="Output data produced by the node",
    )
    started_at: Optional[datetime] = Field(
        default=None,
        description="When node execution began",
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="When node execution finished",
    )
    duration_ms: Optional[int] = Field(
        default=None,
        ge=0,
        description="Node execution time in milliseconds",
    )
    tokens_input: int = Field(
        default=0,
        ge=0,
        description="Number of input tokens consumed",
    )
    tokens_output: int = Field(
        default=0,
        ge=0,
        description="Number of output tokens generated",
    )
    error: Optional[dict[str, Any]] = Field(
        default=None,
        description="Error details if the node failed",
    )
    retry_count: int = Field(
        default=0,
        ge=0,
        description="Number of retry attempts",
    )
    artifact_ids: list[UUID] = Field(
        default_factory=list,
        description="References to artifacts produced by this execution",
    )
    created_at: datetime = Field(..., description="Record creation timestamp")


# ───────────────────────────────────────────────
# Detailed Run Response Schema
# ───────────────────────────────────────────────


class WorkflowRunDetailResponse(BaseModel):
    """Schema for detailed workflow run responses.

    Includes the run metadata plus a complete list of node executions,
    providing a full picture of the workflow execution.
    """

    model_config = ConfigDict(from_attributes=True)

    # Run metadata
    id: UUID = Field(..., description="Unique run identifier")
    workflow_id: UUID = Field(..., description="Parent workflow identifier")
    thread_id: UUID = Field(..., description="Session isolation identifier")
    status: str = Field(
        ...,
        description="Execution status",
    )
    inputs: dict[str, Any] = Field(
        default_factory=dict,
        description="Input parameters for this run",
    )
    outputs: dict[str, Any] = Field(
        default_factory=dict,
        description="Output values produced by this run",
    )
    started_at: Optional[datetime] = Field(
        default=None,
        description="When execution began",
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="When execution finished",
    )
    duration_ms: Optional[int] = Field(
        default=None,
        ge=0,
        description="Total execution time in milliseconds",
    )
    error: Optional[dict[str, Any]] = Field(
        default=None,
        description="Error details if the run failed",
    )
    triggered_by: Optional[str] = Field(
        default=None,
        description="Entity that triggered the run",
    )
    trigger_type: Optional[str] = Field(
        default=None,
        description="How this run was triggered",
    )
    created_at: datetime = Field(..., description="Record creation timestamp")

    # Node executions
    node_executions: list[NodeExecutionResponse] = Field(
        default_factory=list,
        description="Individual node executions within this run",
    )

    # Computed fields
    @property
    def total_tokens(self) -> int:
        """Total tokens consumed across all node executions."""
        return sum(
            ne.tokens_input + ne.tokens_output
            for ne in self.node_executions
        )

    @property
    def completed_nodes(self) -> int:
        """Number of nodes that completed successfully."""
        return sum(
            1
            for ne in self.node_executions
            if ne.status == "completed"
        )

    @property
    def failed_nodes(self) -> int:
        """Number of nodes that failed."""
        return sum(
            1
            for ne in self.node_executions
            if ne.status == "failed"
        )
