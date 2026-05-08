"""
Base adapter interface for all Agent adapters.

Defines the abstract contract that every agent adapter must implement,
including task execution, health checks, and MCP tool operations.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import aiohttp


class BaseAdapter(ABC):
    """Base class for all Agent adapters.

    All agent-specific adapters (Claude, Codex, Trae, etc.) must inherit
    from this class and implement the abstract methods. The base class
    manages the shared aiohttp client session for HTTP-based agents.
    """

    def __init__(self, agent_config: dict) -> None:
        """Initialize the adapter with agent configuration.

        Args:
            agent_config: Dictionary containing agent-specific configuration.
                Expected keys vary by adapter but typically include:
                - name: Human-readable agent name
                - slug: Unique identifier (e.g., 'claude', 'codex')
                - endpoint: Base URL for the agent's API
                - api_key: Authentication key (if required)
                - timeout: Request timeout in seconds
        """
        self.config = agent_config
        self.session: aiohttp.ClientSession | None = None  # Lazily initialized

    @abstractmethod
    async def execute(self, task_description: str, variables: dict) -> dict:
        """Execute a task on the agent.

        Args:
            task_description: Natural language description of the task.
            variables: Key-value pairs providing context and inputs.

        Returns:
            Dictionary with keys:
                - output: The agent's response (string)
                - tokens_input: Number of input tokens consumed (int)
                - tokens_output: Number of output tokens consumed (int)
                - duration_ms: Execution duration in milliseconds (int)
                - status: 'completed', 'failed', or 'partial' (string)
        """

    @abstractmethod
    async def health_check(self) -> dict:
        """Check if the agent is healthy and reachable.

        Returns:
            Dictionary with keys:
                - status: 'online' or 'offline' (string)
                - agent: Agent slug identifier (string)
                - version: Agent version string (optional)
                - details: Additional health metadata (optional dict)
        """

    @abstractmethod
    async def list_tools(self) -> list[dict]:
        """List available tools exposed via MCP (Model Context Protocol).

        Returns:
            List of tool dictionaries, each with:
                - name: Tool identifier (string)
                - description: Human-readable description (string)
                - parameters: JSON Schema of accepted parameters (dict)
        """

    @abstractmethod
    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call a specific tool on the agent.

        Args:
            tool_name: Name of the tool to invoke.
            arguments: Tool-specific arguments conforming to the tool's schema.

        Returns:
            Dictionary with the tool execution result.
        """

    async def close(self) -> None:
        """Close the adapter and release resources.

        Closes the underlying aiohttp client session if it was initialized.
        Safe to call multiple times.
        """
        if self.session:
            await self.session.close()
            self.session = None
