"""
Custom exceptions for the AgentNexus backend.

Defines the exception hierarchy for all agent-related errors,
including agent lifecycle, workflow execution, and checkpoint management.
"""
from __future__ import annotations


class AgentNexusException(Exception):
    """Base exception for all AgentNexus errors."""

    def __init__(self, message: str = "AgentNexus error occurred", *, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def __str__(self) -> str:
        if self.details:
            return f"{self.message} | details={self.details}"
        return self.message


class AgentNotFoundError(AgentNexusException):
    """Raised when a requested agent is not found in the registry."""

    def __init__(self, agent_id: str | None = None):
        super().__init__(
            message=f"Agent not found: {agent_id or 'unknown'}",
            details={"agent_id": agent_id},
        )


class AgentOfflineError(AgentNexusException):
    """Raised when an agent is registered but currently offline."""

    def __init__(self, agent_id: str | None = None, agent_name: str | None = None):
        super().__init__(
            message=f"Agent '{agent_name or agent_id}' is currently offline",
            details={"agent_id": agent_id, "agent_name": agent_name},
        )


class WorkflowValidationError(AgentNexusException):
    """Raised when workflow definition fails validation."""

    def __init__(self, message: str = "Workflow validation failed", *, errors: list[str] | None = None):
        super().__init__(
            message=message,
            details={"validation_errors": errors or []},
        )


class WorkflowExecutionError(AgentNexusException):
    """Raised when workflow execution encounters a fatal error."""

    def __init__(self, workflow_id: str | None = None, message: str = "Workflow execution failed"):
        super().__init__(
            message=message,
            details={"workflow_id": workflow_id},
        )


class NodeExecutionError(AgentNexusException):
    """Raised when a specific workflow node fails to execute."""

    def __init__(
        self,
        node_id: str | None = None,
        node_type: str | None = None,
        cause: Exception | None = None,
    ):
        super().__init__(
            message=f"Node execution failed: {node_id or 'unknown'} ({node_type or 'unknown'})",
            details={
                "node_id": node_id,
                "node_type": node_type,
                "cause": str(cause) if cause else None,
            },
        )
        self.cause = cause


class CheckpointNotFoundError(AgentNexusException):
    """Raised when a workflow checkpoint cannot be found."""

    def __init__(self, checkpoint_id: str | None = None, run_id: str | None = None):
        super().__init__(
            message=f"Checkpoint not found: {checkpoint_id or 'unknown'}",
            details={"checkpoint_id": checkpoint_id, "run_id": run_id},
        )


class TemplateRenderError(AgentNexusException):
    """Raised when a template (Jinja2 or otherwise) fails to render."""

    def __init__(self, template_name: str | None = None, cause: Exception | None = None):
        super().__init__(
            message=f"Template render failed: {template_name or 'unknown'}",
            details={
                "template_name": template_name,
                "cause": str(cause) if cause else None,
            },
        )
        self.cause = cause


class MCPError(AgentNexusException):
    """Raised when an MCP (Model Context Protocol) operation fails."""

    def __init__(self, server_name: str | None = None, tool_name: str | None = None, message: str = "MCP error"):
        super().__init__(
            message=message,
            details={"server_name": server_name, "tool_name": tool_name},
        )


class A2AError(AgentNexusException):
    """Raised when an A2A (Agent-to-Agent) communication fails."""

    def __init__(self, sender: str | None = None, recipient: str | None = None, message: str = "A2A communication error"):
        super().__init__(
            message=message,
            details={"sender": sender, "recipient": recipient},
        )
