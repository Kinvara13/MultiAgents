"""
Utility functions for the AgentNexus backend.

Provides common helpers for UUID generation, timestamp formatting,
JSON parsing, dictionary merging, and string manipulation.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any


def generate_uuid() -> str:
    """Generate a random UUID4 string.

    Returns:
        Hex string representation of a UUID4 (e.g., 'a1b2c3d4-e5f6-...').
    """
    return str(uuid.uuid4())


def now_iso() -> str:
    """Get the current UTC time as an ISO 8601 formatted string.

    Returns:
        ISO 8601 timestamp with timezone info (e.g., '2024-01-15T09:30:00+00:00').
    """
    return datetime.now(timezone.utc).isoformat()


def safe_json_loads(s: str) -> dict:
    """Safely parse a JSON string, returning an empty dict on failure.

    Args:
        s: JSON string to parse.

    Returns:
        Parsed dictionary, or empty dict if parsing fails.
    """
    if not s:
        return {}
    try:
        result = json.loads(s)
        return result if isinstance(result, dict) else {}
    except (json.JSONDecodeError, TypeError, ValueError):
        return {}


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """Deep merge two dictionaries, with override taking precedence.

    Recursively merges nested dictionaries. Lists and other types from
    override completely replace those in base.

    Args:
        base: The base dictionary.
        override: Dictionary whose values override base.

    Returns:
        New dictionary containing the merged result.
    """
    result = dict(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def truncate_string(s: str, max_len: int = 500) -> str:
    """Truncate a string to a maximum length, adding ellipsis if truncated.

    Args:
        s: Input string.
        max_len: Maximum allowed length (default: 500).

    Returns:
        Truncated string with '...' appended if it was cut.
    """
    if not s or len(s) <= max_len:
        return s
    return s[: max_len - 3] + "..."


def snake_to_camel(snake_str: str) -> str:
    """Convert a snake_case string to camelCase.

    Args:
        snake_str: Snake case string (e.g., 'health_check_status').

    Returns:
        camelCase string (e.g., 'healthCheckStatus').
    """
    parts = snake_str.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def camel_to_snake(camel_str: str) -> str:
    """Convert a camelCase string to snake_case.

    Args:
        camel_str: Camel case string (e.g., 'healthCheckStatus').

    Returns:
        snake_case string (e.g., 'health_check_status').
    """
    import re

    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", camel_str)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()
