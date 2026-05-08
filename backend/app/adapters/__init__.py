"""
Agent adapter registry and factory.

Provides a centralized factory for creating and configuring all
agent adapters. New adapters are automatically registered here.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.adapters.base import BaseAdapter

from app.adapters.claude import ClaudeAdapter
from app.adapters.codex import CodexAdapter
from app.adapters.cursor import CursorAdapter
from app.adapters.hermes import HermesAdapter
from app.adapters.openclaw import OpenClawAdapter
from app.adapters.trae import TraeAdapter

# Registry mapping agent slugs to adapter classes
_ADAPTER_REGISTRY: dict[str, type[BaseAdapter]] = {
    "claude": ClaudeAdapter,
    "codex": CodexAdapter,
    "trae": TraeAdapter,
    "openclaw": OpenClawAdapter,
    "hermes": HermesAdapter,
    "cursor": CursorAdapter,
}


def get_adapter_class(slug: str) -> type[BaseAdapter] | None:
    """Get the adapter class for a given agent slug.

    Args:
        slug: Agent identifier (e.g., 'claude', 'codex').

    Returns:
        The adapter class, or None if not found.
    """
    return _ADAPTER_REGISTRY.get(slug)


def list_available_adapters() -> list[str]:
    """List all registered adapter slugs.

    Returns:
        List of agent slug strings.
    """
    return list(_ADAPTER_REGISTRY.keys())


def register_adapter(slug: str, adapter_class: type[BaseAdapter]) -> None:
    """Register a new adapter class.

    Args:
        slug: Unique identifier for the adapter.
        adapter_class: The adapter class (must inherit from BaseAdapter).

    Raises:
        ValueError: If the slug is already registered.
        TypeError: If the adapter_class does not inherit from BaseAdapter.
    """
    from app.adapters.base import BaseAdapter

    if not issubclass(adapter_class, BaseAdapter):
        raise TypeError(f"Adapter must inherit from BaseAdapter, got {adapter_class}")
    if slug in _ADAPTER_REGISTRY:
        raise ValueError(f"Adapter slug '{slug}' is already registered")
    _ADAPTER_REGISTRY[slug] = adapter_class


def create_adapters() -> dict[str, BaseAdapter]:
    """Factory function that creates instances of all registered adapters.

    Returns a dict mapping agent slugs to initialized adapter instances.
    Each adapter is created with default configuration.

    Returns:
        Dictionary of {slug: adapter_instance} for all registered adapters.

    Example:
        >>> adapters = create_adapters()
        >>> adapters["claude"].health_check()
        {'status': 'online', 'agent': 'claude', ...}
    """
    instances: dict[str, BaseAdapter] = {}

    # Default configurations for each adapter
    default_configs: dict[str, dict] = {
        "claude": {
            "name": "Claude",
            "slug": "claude",
            "endpoint": "http://localhost:8080",
            "timeout": 60,
        },
        "codex": {
            "name": "Codex",
            "slug": "codex",
            "endpoint": "http://localhost:8081",
            "timeout": 60,
        },
        "trae": {
            "name": "Trae",
            "slug": "trae",
            "endpoint": "http://localhost:8082",
            "timeout": 30,
        },
        "openclaw": {
            "name": "OpenClaw",
            "slug": "openclaw",
            "endpoint": "http://localhost:3001",
            "timeout": 45,
        },
        "hermes": {
            "name": "Hermes",
            "slug": "hermes",
            "endpoint": "http://localhost:3002",
            "timeout": 15,
        },
        "cursor": {
            "name": "Cursor",
            "slug": "cursor",
            "endpoint": "http://localhost:8083",
            "timeout": 30,
        },
    }

    for slug, adapter_class in _ADAPTER_REGISTRY.items():
        config = default_configs.get(slug, {"name": slug, "slug": slug})
        try:
            instances[slug] = adapter_class(config)
        except Exception as exc:
            # Log but don't fail - other adapters can still be created
            print(f"[AdapterFactory] Failed to create adapter '{slug}': {exc}")

    return instances


__all__ = [
    "BaseAdapter",
    "ClaudeAdapter",
    "CodexAdapter",
    "CursorAdapter",
    "HermesAdapter",
    "OpenClawAdapter",
    "TraeAdapter",
    "create_adapters",
    "get_adapter_class",
    "list_available_adapters",
    "register_adapter",
]
