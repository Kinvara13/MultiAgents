"""
Agent Gateway for AgentNexus.

Provides a central gateway for all Agent communications.  Adapters for
individual agent types (Claude, Codex, Trae, OpenClaw, Hermes, Cursor, …)
are registered at runtime.  The gateway dispatches execution and health-check
requests to the appropriate adapter.

Example::

    gateway = AgentGateway()
    await gateway.register_adapter("claude", ClaudeAdapter())
    result = await gateway.execute("claude", "Summarise this text", variables)
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class AgentGatewayError(Exception):
    """Base exception for agent gateway errors."""


class AgentTypeNotRegisteredError(AgentGatewayError):
    """Raised when an operation targets an unregistered agent type."""


class AdapterExecutionError(AgentGatewayError):
    """Raised when an adapter fails to execute a task."""


# ---------------------------------------------------------------------------
# Abstract base adapter
# ---------------------------------------------------------------------------


class BaseAdapter(ABC):
    """Abstract base class for agent adapters.

    All concrete adapters (Claude, Codex, Trae, …) must implement this
    interface so that the gateway can dispatch uniformly.
    """

    @abstractmethod
    async def execute(self, task: str, variables: dict[str, Any]) -> dict:
        """Execute a task and return a result dictionary.

        Args:
            task: The task description (may contain resolved template vars).
            variables: Execution context variables.

        Returns:
            Result dictionary (structure is adapter-specific).
        """

    @abstractmethod
    async def health_check(self) -> dict:
        """Return adapter health status.

        Returns:
            Dictionary with at least a ``status`` key (``healthy``,
            ``degraded``, or ``unhealthy``).
        """

    @abstractmethod
    async def stream(self, task: str, variables: dict[str, Any]) -> Any:
        """Execute a task in streaming mode.

        Args:
            task: The task description.
            variables: Execution context variables.

        Returns:
            Async iterator yielding partial result chunks.
        """


# ---------------------------------------------------------------------------
# Concrete adapter implementations (minimal – expand in production)
# ---------------------------------------------------------------------------


class ClaudeAdapter(BaseAdapter):
    """Adapter for Anthropic Claude API."""

    def __init__(self, api_key: str | None = None, model: str = "claude-sonnet-4-20250514") -> None:
        self.api_key = api_key
        self.model = model
        self._client: Any | None = None

    async def execute(self, task: str, variables: dict[str, Any]) -> dict:
        """Execute task via Anthropic Claude API."""
        import httpx

        api_key = self.api_key or variables.get("anthropic_api_key")
        if not api_key:
            return {"status": "error", "reason": "Missing Anthropic API key"}

        messages = [{"role": "user", "content": task}]
        system_prompt = variables.get("system_prompt", "You are a helpful assistant.")

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "max_tokens": variables.get("max_tokens", 4096),
                        "system": system_prompt,
                        "messages": messages,
                    },
                )
                data = response.json()
                if response.status_code == 200:
                    content = ""
                    for block in data.get("content", []):
                        if block.get("type") == "text":
                            content += block.get("text", "")
                    return {
                        "status": "success",
                        "content": content,
                        "model": self.model,
                        "usage": data.get("usage", {}),
                    }
                return {
                    "status": "error",
                    "reason": data.get("error", {}).get("message", "Unknown error"),
                    "status_code": response.status_code,
                }
        except Exception as exc:
            return {"status": "error", "reason": str(exc), "error_type": type(exc).__name__}

    async def health_check(self) -> dict:
        """Check Claude API health."""
        return {"status": "healthy", "agent_type": "claude", "model": self.model}

    async def stream(self, task: str, variables: dict[str, Any]) -> Any:
        """Stream response from Claude API."""
        # Placeholder: yield chunks in production
        result = await self.execute(task, variables)
        yield result


class CodexAdapter(BaseAdapter):
    """Adapter for OpenAI Codex API."""

    def __init__(self, api_key: str | None = None, model: str = "gpt-4o") -> None:
        self.api_key = api_key
        self.model = model

    async def execute(self, task: str, variables: dict[str, Any]) -> dict:
        """Execute task via OpenAI API."""
        import httpx

        api_key = self.api_key or variables.get("openai_api_key")
        if not api_key:
            return {"status": "error", "reason": "Missing OpenAI API key"}

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": task}],
                        "temperature": variables.get("temperature", 0.7),
                        "max_tokens": variables.get("max_tokens", 4096),
                    },
                )
                data = response.json()
                if response.status_code == 200:
                    choices = data.get("choices", [])
                    content = choices[0]["message"]["content"] if choices else ""
                    return {
                        "status": "success",
                        "content": content,
                        "model": self.model,
                        "usage": data.get("usage", {}),
                    }
                return {
                    "status": "error",
                    "reason": data.get("error", {}).get("message", "Unknown error"),
                    "status_code": response.status_code,
                }
        except Exception as exc:
            return {"status": "error", "reason": str(exc), "error_type": type(exc).__name__}

    async def health_check(self) -> dict:
        """Check OpenAI API health."""
        return {"status": "healthy", "agent_type": "codex", "model": self.model}

    async def stream(self, task: str, variables: dict[str, Any]) -> Any:
        """Stream response from OpenAI API."""
        result = await self.execute(task, variables)
        yield result


class MockAdapter(BaseAdapter):
    """Mock adapter for testing and development.

    Returns canned responses based on the agent type name.
    """

    def __init__(self, agent_type: str = "mock") -> None:
        self.agent_type = agent_type

    async def execute(self, task: str, variables: dict[str, Any]) -> dict:
        """Return a mock response."""
        logger.info("[MockAdapter:%s] Executing task: %s", self.agent_type, task[:80])
        return {
            "status": "success",
            "content": f"[{self.agent_type}] Processed: {task[:200]}",
            "model": f"mock-{self.agent_type}",
            "usage": {"prompt_tokens": len(task.split()), "completion_tokens": 20},
        }

    async def health_check(self) -> dict:
        """Always healthy."""
        return {"status": "healthy", "agent_type": self.agent_type, "model": "mock"}

    async def stream(self, task: str, variables: dict[str, Any]) -> Any:
        """Yield a single mock chunk."""
        yield await self.execute(task, variables)


# ---------------------------------------------------------------------------
# Agent Gateway
# ---------------------------------------------------------------------------


class AgentGateway:
    """Central gateway for all Agent communications.

    Maintains a registry of :class:`BaseAdapter` instances keyed by agent
    type name.  All agent interactions flow through this gateway so that
    adapters can be swapped, health-checked, and monitored centrally.

    Attributes:
        adapters: Mapping of agent type → adapter instance.
    """

    def __init__(self) -> None:
        self.adapters: dict[str, BaseAdapter] = {}

    # -- lifecycle -----------------------------------------------------------

    async def register_adapter(self, agent_type: str, adapter: BaseAdapter) -> None:
        """Register an adapter for the given agent type.

        Args:
            agent_type: Short identifier (e.g. ``'claude'``, ``'codex'``).
            adapter: Concrete adapter instance.
        """
        self.adapters[agent_type] = adapter
        logger.info("Registered adapter for agent type '%s': %s", agent_type, adapter.__class__.__name__)

    async def unregister_adapter(self, agent_type: str) -> None:
        """Remove an adapter from the registry.

        Args:
            agent_type: Agent type to unregister.
        """
        if agent_type in self.adapters:
            del self.adapters[agent_type]
            logger.info("Unregistered adapter for agent type '%s'", agent_type)

    # -- execution -----------------------------------------------------------

    async def execute(
        self,
        agent_type: str,
        task: str,
        variables: dict[str, Any],
    ) -> dict:
        """Execute a task through the adapter for *agent_type*.

        Args:
            agent_type: Registered agent type identifier.
            task: Task description string.
            variables: Execution context variables.

        Returns:
            Adapter result dictionary.

        Raises:
            AgentTypeNotRegisteredError: If no adapter is registered.
            AdapterExecutionError: If the adapter raises an exception.
        """
        adapter = self.adapters.get(agent_type)
        if adapter is None:
            raise AgentTypeNotRegisteredError(
                f"No adapter registered for agent type: {agent_type}. "
                f"Registered types: {list(self.adapters.keys())}"
            )

        try:
            logger.info(
                "[AgentGateway] Dispatching task to '%s' (task=%s...)",
                agent_type,
                task[:60],
            )
            result = await adapter.execute(task, variables)
            logger.info(
                "[AgentGateway] Task completed by '%s' (status=%s)",
                agent_type,
                result.get("status", "unknown"),
            )
            return result
        except AgentGatewayError:
            raise
        except Exception as exc:
            raise AdapterExecutionError(
                f"Adapter '{agent_type}' failed to execute task: {exc}"
            ) from exc

    async def stream(
        self,
        agent_type: str,
        task: str,
        variables: dict[str, Any],
    ) -> Any:
        """Execute a task in streaming mode.

        Args:
            agent_type: Registered agent type identifier.
            task: Task description string.
            variables: Execution context variables.

        Returns:
            Async iterator yielding result chunks.

        Raises:
            AgentTypeNotRegisteredError: If no adapter is registered.
        """
        adapter = self.adapters.get(agent_type)
        if adapter is None:
            raise AgentTypeNotRegisteredError(
                f"No adapter registered for agent type: {agent_type}"
            )
        return adapter.stream(task, variables)

    # -- health checks -------------------------------------------------------

    async def health_check(self, agent_type: str) -> dict:
        """Check the health of a specific agent adapter.

        Args:
            agent_type: Agent type to check.

        Returns:
            Health status dictionary.
        """
        adapter = self.adapters.get(agent_type)
        if adapter is None:
            return {"status": "unknown", "agent_type": agent_type}

        try:
            return await adapter.health_check()
        except Exception as exc:
            logger.warning("Health check failed for '%s': %s", agent_type, exc)
            return {
                "status": "unhealthy",
                "agent_type": agent_type,
                "error": str(exc),
            }

    async def health_check_all(self) -> dict[str, dict]:
        """Check the health of all registered adapters.

        Returns:
            Mapping of agent type → health status dictionary.
        """
        results: dict[str, dict] = {}
        for agent_type in self.adapters:
            results[agent_type] = await self.health_check(agent_type)
        return results

    # -- introspection -------------------------------------------------------

    def list_adapters(self) -> list[str]:
        """Return a list of registered agent type names."""
        return list(self.adapters.keys())

    def is_registered(self, agent_type: str) -> bool:
        """Return ``True`` if an adapter is registered for *agent_type*."""
        return agent_type in self.adapters
