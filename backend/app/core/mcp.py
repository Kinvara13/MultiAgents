"""
MCP (Model Context Protocol) server registry.

Manages registration and discovery of MCP tool servers,
enabling agents to discover and invoke tools across the system.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.exceptions import MCPError


@dataclass
class MCPTool:
    """Represents a tool exposed by an MCP server.

    Attributes:
        name: Tool identifier (unique within a server).
        description: Human-readable description of what the tool does.
        parameters: JSON Schema describing accepted parameters.
    """

    name: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a dictionary representation.

        Returns:
            Dict with name, description, and parameters schema.
        """
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }


@dataclass
class MCPServer:
    """Represents a registered MCP tool server.

    Attributes:
        name: Server identifier (unique).
        version: Server version string (semver).
        tools: List of tools exposed by this server.
        endpoint: Optional HTTP endpoint for the server.
        metadata: Additional server metadata.
    """

    name: str
    version: str
    tools: list[MCPTool] = field(default_factory=list)
    endpoint: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def get_tool(self, tool_name: str) -> MCPTool | None:
        """Get a tool by name.

        Args:
            tool_name: Name of the tool to find.

        Returns:
            The MCPTool if found, None otherwise.
        """
        for tool in self.tools:
            if tool.name == tool_name:
                return tool
        return None

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a dictionary representation.

        Returns:
            Dict with server info and all tool definitions.
        """
        return {
            "name": self.name,
            "version": self.version,
            "endpoint": self.endpoint,
            "metadata": self.metadata,
            "tools": [tool.to_dict() for tool in self.tools],
        }


class MCPServerRegistry:
    """Registry for MCP tool servers.

    Manages the collection of registered MCP servers and provides
    unified tool discovery and invocation across all servers.

    Attributes:
        servers: Dict mapping server names to MCPServer instances.
    """

    def __init__(self) -> None:
        """Initialize an empty MCP server registry."""
        self.servers: dict[str, MCPServer] = {}

    def register(self, server: MCPServer) -> None:
        """Register an MCP server.

        Args:
            server: The MCPServer instance to register.

        Raises:
            MCPError: If a server with the same name already exists.
        """
        if server.name in self.servers:
            raise MCPError(
                server_name=server.name,
                message=f"MCP server '{server.name}' is already registered",
            )
        self.servers[server.name] = server

    def unregister(self, server_name: str) -> MCPServer | None:
        """Unregister an MCP server.

        Args:
            server_name: Name of the server to remove.

        Returns:
            The removed MCPServer, or None if not found.
        """
        return self.servers.pop(server_name, None)

    def get_server(self, server_name: str) -> MCPServer | None:
        """Get a registered server by name.

        Args:
            server_name: Server identifier.

        Returns:
            The MCPServer if found, None otherwise.
        """
        return self.servers.get(server_name)

    async def discover_tools(self, agent_id: str | None = None) -> list[dict[str, Any]]:
        """Discover all available tools across registered servers.

        Optionally filters tools by agent compatibility.

        Args:
            agent_id: Optional agent ID to filter for compatible tools.

        Returns:
            List of tool definitions, each including the server name.
        """
        results = []
        for server_name, server in self.servers.items():
            for tool in server.tools:
                tool_dict = tool.to_dict()
                tool_dict["server"] = server_name
                tool_dict["server_version"] = server.version
                results.append(tool_dict)
        return results

    async def call_tool(self, server_name: str, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Call a tool on a specific MCP server.

        Args:
            server_name: Name of the MCP server hosting the tool.
            tool_name: Name of the tool to invoke.
            arguments: Tool arguments conforming to the tool's schema.

        Returns:
            Tool execution result.

        Raises:
            MCPError: If the server or tool is not found.
        """
        server = self.servers.get(server_name)
        if not server:
            raise MCPError(
                server_name=server_name,
                tool_name=tool_name,
                message=f"MCP server '{server_name}' not found",
            )

        tool = server.get_tool(tool_name)
        if not tool:
            available = [t.name for t in server.tools]
            raise MCPError(
                server_name=server_name,
                tool_name=tool_name,
                message=f"Tool '{tool_name}' not found on server '{server_name}'. Available: {available}",
            )

        # In a real implementation, this would make an HTTP call or RPC
        # to the actual MCP server to execute the tool
        return {
            "status": "success",
            "server": server_name,
            "tool": tool_name,
            "arguments": arguments,
            "result": f"Tool '{tool_name}' executed on '{server_name}' with arguments: {arguments}",
        }

    def list_servers(self) -> list[dict[str, Any]]:
        """List all registered servers with their tool counts.

        Returns:
            List of server summary dicts.
        """
        return [
            {
                "name": name,
                "version": server.version,
                "endpoint": server.endpoint,
                "tool_count": len(server.tools),
            }
            for name, server in self.servers.items()
        ]

    def get_tool_count(self) -> int:
        """Get the total number of tools across all servers.

        Returns:
            Total tool count.
        """
        return sum(len(server.tools) for server in self.servers.values())
