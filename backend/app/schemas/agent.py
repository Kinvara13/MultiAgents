"""Pydantic schemas for the Agent model.

Schemas cover the full lifecycle of agent management:
- CRUD operations (Base, Create, Update, Response)
- List responses with pagination
- Invocation request/response for direct agent calls
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ───────────────────────────────────────────────
# Shared field definitions
# ───────────────────────────────────────────────

AGENT_NAME_PATTERN = r"^[a-zA-Z0-9_\-\s]{1,128}$"
SLUG_PATTERN = r"^[a-z0-9_\-]{1,128}$"
HEX_COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"


# ───────────────────────────────────────────────
# Base Schemas
# ───────────────────────────────────────────────


class AgentBase(BaseModel):
    """Base schema with shared agent fields.

    Attributes:
        name: Human-readable agent name.
        type: Agent type — 'local' or 'remote'.
        endpoint: API endpoint URL for remote agents.
        capabilities: List of capability tags.
        description: Human-readable description.
        icon: Icon identifier or URL.
        color: Hex color string for UI theming.
        config: Extended configuration dictionary.
    """

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    name: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Human-readable agent name (e.g., 'Claude')",
        examples=["Claude", "GPT-4", "CodeLlama"],
    )
    type: str = Field(
        ...,
        pattern=r"^(local|remote)$",
        description="Agent type: 'local' (self-hosted) or 'remote' (API)",
        examples=["remote", "local"],
    )
    endpoint: Optional[str] = Field(
        default=None,
        max_length=512,
        description="API endpoint URL for remote agents",
        examples=["https://api.anthropic.com/v1/messages"],
    )
    capabilities: list[str] = Field(
        default_factory=list,
        description="Capability tags (e.g., ['code_generation', 'code_review'])",
        examples=[["code_generation", "code_review"]],
    )
    description: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Human-readable description of the agent",
        examples=["Anthropic's Claude 3.5 Sonnet model"],
    )
    icon: Optional[str] = Field(
        default=None,
        max_length=256,
        description="Icon identifier or URL",
        examples=["bot", "https://example.com/icon.png"],
    )
    color: Optional[str] = Field(
        default=None,
        pattern=HEX_COLOR_PATTERN,
        description="Hex color string for UI theming (e.g., '#FF5733')",
        examples=["#CC785C", "#10A37F"],
    )
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="Extended agent configuration",
        examples=[{"temperature": 0.7, "max_tokens": 4096}],
    )


# ───────────────────────────────────────────────
# Request Schemas (Create / Update)
# ───────────────────────────────────────────────


class AgentCreate(AgentBase):
    """Schema for creating a new agent.

    Extends AgentBase with additional fields required for creation.
    """

    slug: str = Field(
        ...,
        min_length=1,
        max_length=128,
        pattern=SLUG_PATTERN,
        description="URL-safe unique identifier (e.g., 'claude')",
        examples=["claude", "gpt-4", "codellama"],
    )
    api_key: Optional[str] = Field(
        default=None,
        max_length=512,
        description="API key for remote agents (will be encrypted at rest)",
    )

    @field_validator("slug")
    @classmethod
    def slug_to_lowercase(cls, v: str) -> str:
        """Normalize slug to lowercase."""
        return v.lower()


class AgentUpdate(BaseModel):
    """Schema for updating an existing agent.

    All fields are optional — only provided fields will be updated.
    """

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Human-readable agent name",
    )
    slug: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        pattern=SLUG_PATTERN,
        description="URL-safe unique identifier",
    )
    type: Optional[str] = Field(
        default=None,
        pattern=r"^(local|remote)$",
        description="Agent type: 'local' or 'remote'",
    )
    status: Optional[str] = Field(
        default=None,
        pattern=r"^(online|offline|busy|error)$",
        description="Operational status",
    )
    endpoint: Optional[str] = Field(
        default=None,
        max_length=512,
        description="API endpoint URL",
    )
    api_key: Optional[str] = Field(
        default=None,
        max_length=512,
        description="API key (will be encrypted at rest)",
    )
    capabilities: Optional[list[str]] = Field(
        default=None,
        description="Capability tags",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Human-readable description",
    )
    icon: Optional[str] = Field(
        default=None,
        max_length=256,
        description="Icon identifier or URL",
    )
    color: Optional[str] = Field(
        default=None,
        pattern=HEX_COLOR_PATTERN,
        description="Hex color string",
    )
    config: Optional[dict[str, Any]] = Field(
        default=None,
        description="Extended configuration",
    )

    @field_validator("slug")
    @classmethod
    def slug_to_lowercase(cls, v: Optional[str]) -> Optional[str]:
        """Normalize slug to lowercase."""
        if v is not None:
            return v.lower()
        return v


# ───────────────────────────────────────────────
# Response Schemas
# ───────────────────────────────────────────────


class AgentResponse(AgentBase):
    """Schema for agent responses (read operations).

    Includes all base fields plus generated fields from the database.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Unique agent identifier")
    slug: str = Field(..., description="URL-safe unique identifier")
    status: str = Field(
        default="offline",
        description="Operational status: 'online', 'offline', 'busy', 'error'",
    )
    total_tasks: int = Field(
        default=0,
        ge=0,
        description="Total number of tasks executed",
    )
    success_rate: float = Field(
        default=100.0,
        ge=0.0,
        le=100.0,
        description="Percentage of successful executions",
    )
    avg_duration_ms: int = Field(
        default=0,
        ge=0,
        description="Average task duration in milliseconds",
    )
    last_active_at: Optional[datetime] = Field(
        default=None,
        description="Last time the agent was invoked",
    )
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Record last-update timestamp")


class AgentListResponse(BaseModel):
    """Schema for paginated agent list responses.

    Attributes:
        items: List of agents on the current page.
        total: Total number of agents matching the query.
        page: Current page number (1-indexed).
        page_size: Number of items per page.
        pages: Total number of pages.
    """

    model_config = ConfigDict(from_attributes=True)

    items: list[AgentResponse] = Field(
        default_factory=list,
        description="List of agents on the current page",
    )
    total: int = Field(..., ge=0, description="Total number of matching agents")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")


# ───────────────────────────────────────────────
# Invocation Schemas
# ───────────────────────────────────────────────


class AgentInvokeRequest(BaseModel):
    """Schema for direct agent invocation requests.

    Used when calling an agent directly without a workflow.
    """

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    task_description: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Natural language description of the task",
        examples=["Generate a Python function to parse JSON files"],
    )
    input_variables: dict[str, Any] = Field(
        default_factory=dict,
        description="Named input variables for templated prompts",
        examples=[{"language": "python", "file_type": "json"}],
    )
    model_config_override: Optional[dict[str, Any]] = Field(
        default=None,
        description="Per-request model configuration overrides",
        examples=[{"temperature": 0.5, "max_tokens": 2048}],
    )


class AgentInvokeResponse(BaseModel):
    """Schema for direct agent invocation responses.

    Contains the agent's output and execution metadata.
    """

    model_config = ConfigDict(from_attributes=True)

    output: str = Field(
        ...,
        description="Generated output from the agent",
    )
    tokens_used: int = Field(
        ...,
        ge=0,
        description="Total tokens consumed (input + output)",
    )
    tokens_input: int = Field(
        default=0,
        ge=0,
        description="Input tokens consumed",
    )
    tokens_output: int = Field(
        default=0,
        ge=0,
        description="Output tokens generated",
    )
    duration_ms: int = Field(
        ...,
        ge=0,
        description="Execution duration in milliseconds",
    )
    agent_id: Optional[UUID] = Field(
        default=None,
        description="ID of the agent that handled the request",
    )
    agent_name: Optional[str] = Field(
        default=None,
        description="Name of the agent that handled the request",
    )
