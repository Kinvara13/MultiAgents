"""Trae adapter - connects to local Trae AI IDE HTTP service."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.adapters.base import BaseAdapter


class TraeAdapter(BaseAdapter):
    """Production adapter for local Trae IDE HTTP service.

    Trae exposes a local HTTP server (default port 7777) that
    accepts commands for file editing, terminal execution, etc.

    Requires ``endpoint`` config, e.g. ``http://localhost:7777``.
    """

    async def execute(self, task_description: str, variables: dict | None = None) -> dict[str, Any]:
        """Send command to local Trae service."""
        endpoint = self.config.get("endpoint", "http://localhost:7777")
        if not endpoint:
            return {
                "status": "error",
                "output": (
                    "❌ Trae endpoint not configured.\n\n"
                    "Set endpoint in Settings → Connections:\n"
                    "  http://localhost:7777\n\n"
                    "Make sure Trae IDE is running with HTTP API enabled."
                ),
                "duration_ms": 0,
            }

        payload = {
            "action": "execute",
            "task": task_description,
            "context": variables or {},
        }

        start = asyncio.get_event_loop().time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                url = endpoint.rstrip("/") + "/api/v1/command"
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

            duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
            return {
                "status": "completed",
                "output": data.get("result", data.get("output", str(data))),
                "duration_ms": duration_ms,
                "source": "trae-local",
            }

        except httpx.ConnectError:
            return {
                "status": "error",
                "output": (
                    f"Cannot connect to Trae at {endpoint}.\n"
                    f"Make sure Trae IDE is running.\n"
                    f"Enable HTTP API in Trae settings."
                ),
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }
        except Exception as exc:
            return {
                "status": "error",
                "output": f"Error: {type(exc).__name__}: {exc}",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }

    async def health_check(self) -> dict[str, Any]:
        endpoint = self.config.get("endpoint", "http://localhost:7777")
        if not endpoint:
            return {"status": "offline", "reason": "endpoint not configured"}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(endpoint.rstrip("/") + "/health")
                if response.status_code == 200:
                    return {"status": "online", "latency_ms": int(response.elapsed.total_seconds() * 1000)}
                return {"status": "offline", "code": response.status_code}
        except Exception as exc:
            return {"status": "offline", "reason": str(exc)}

    async def list_tools(self) -> list[dict]:
        return [
            {"name": "run_tests", "description": "Run test suite", "parameters": {"test_path": "string"}},
            {"name": "execute_command", "description": "Execute terminal command", "parameters": {"command": "string", "cwd": "string"}},
            {"name": "edit_file", "description": "Edit file content", "parameters": {"path": "string", "content": "string"}},
            {"name": "git_operations", "description": "Git commit/branch/merge", "parameters": {"command": "string"}},
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        return await self.execute(f"Run: {tool_name}", arguments)
