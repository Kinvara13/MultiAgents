"""Cursor adapter - connects to local Cursor IDE HTTP service."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.adapters.base import BaseAdapter


class CursorAdapter(BaseAdapter):
    """Production adapter for local Cursor AI IDE HTTP service.

    Cursor exposes a local HTTP API (default port 8083) for
    code suggestions, inline edits, and chat.

    Requires ``endpoint`` config, e.g. ``http://localhost:8083``.
    """

    async def execute(self, task_description: str, variables: dict | None = None) -> dict[str, Any]:
        """Send coding task to Cursor local API."""
        endpoint = self.config.get("endpoint", "http://localhost:8083")
        if not endpoint:
            return {
                "status": "error",
                "output": (
                    "❌ Cursor endpoint not configured.\n\n"
                    "Set endpoint in Settings → Connections:\n"
                    "  http://localhost:8083\n\n"
                    "Make sure Cursor IDE is running with API enabled."
                ),
                "duration_ms": 0,
            }

        code_context = (variables or {}).get("code", "")
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are Cursor AI, an expert programming assistant.",
                },
                {
                    "role": "user",
                    "content": f"Task: {task_description}\n\nCode:\n{code_context}" if code_context else task_description,
                },
            ],
            "stream": False,
        }

        start = asyncio.get_event_loop().time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                url = endpoint.rstrip("/") + "/api/v1/chat"
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

            duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
            return {
                "status": "completed",
                "output": data.get("content", data.get("text", data.get("result", str(data)))),
                "duration_ms": duration_ms,
                "source": "cursor-local",
            }

        except httpx.ConnectError:
            return {
                "status": "error",
                "output": (
                    f"Cannot connect to Cursor at {endpoint}.\n"
                    f"Make sure Cursor IDE is running with API enabled in Settings."
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
        endpoint = self.config.get("endpoint", "http://localhost:8083")
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
            {"name": "code_suggest", "description": "Get inline code suggestions", "parameters": {"code": "string", "cursor_position": "number"}},
            {"name": "explain", "description": "Explain selected code", "parameters": {"code": "string"}},
            {"name": "fix", "description": "Fix code issues", "parameters": {"code": "string", "issues": "string[]"}},
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        return await self.execute(f"Tool: {tool_name}", arguments)
