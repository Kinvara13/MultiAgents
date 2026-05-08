"""
Core infrastructure modules for AgentNexus.

Provides the foundational building blocks including:
- Execution context management
- A2A message bus for agent communication
- MCP (Model Context Protocol) server registry
- Custom exception hierarchy
"""
from __future__ import annotations

from app.core.context import ExecutionContext
from app.core.exceptions import (
    A2AError,
    AgentNexusException,
    AgentNotFoundError,
    AgentOfflineError,
    CheckpointNotFoundError,
    MCPError,
    NodeExecutionError,
    TemplateRenderError,
    WorkflowExecutionError,
    WorkflowValidationError,
)
from app.core.mcp import MCPServer, MCPServerRegistry, MCPTool
from app.core.message_bus import MessageBus

__all__ = [
    # Context
    "ExecutionContext",
    # MCP
    "MCPServer",
    "MCPServerRegistry",
    "MCPTool",
    # Message Bus
    "MessageBus",
    # Exceptions
    "AgentNexusException",
    "AgentNotFoundError",
    "AgentOfflineError",
    "WorkflowValidationError",
    "WorkflowExecutionError",
    "NodeExecutionError",
    "CheckpointNotFoundError",
    "TemplateRenderError",
    "MCPError",
    "A2AError",
]
