"""Hermes adapter - connects to remote WebSocket/HTTP messaging service."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.adapters.base import BaseAdapter


class HermesAdapter(BaseAdapter):
    """Production adapter for Hermes messaging/routing service.

    Supports both HTTP REST and WebSocket modes.
    Configure with ``endpoint`` (e.g. ``http://localhost:3002``
    or ``ws://localhost:3002``).
    """

    async def execute(self, task_description: str, variables: dict | None = None) -> dict[str, Any]:
        """Send routing/notification task to Hermes."""
        endpoint = self.config.get("endpoint")
        if not endpoint:
            return {
                "status": "error",
                "output": (
                    "❌ Hermes endpoint not configured.\n\n"
                    "Set endpoint in Settings → Connections, e.g.:\n"
                    "  http://your-hermes-server:3002"
                ),
                "duration_ms": 0,
            }

        payload = {
            "action": "route",
            "task": task_description,
            "payload": variables or {},
        }

        start = asyncio.get_event_loop().time()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = endpoint.rstrip("/") + "/api/v1/route"
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

            duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
            return {
                "status": "completed",
                "output": data.get("result", f"Routed: {task_description}"),
                "duration_ms": duration_ms,
                "source": "hermes",
            }

        except httpx.ConnectError:
            return {
                "status": "error",
                "output": f"Cannot connect to Hermes at {endpoint}. Is the service running?",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }
        except Exception as exc:
            return {
                "status": "error",
                "output": f"Error: {type(exc).__name__}: {exc}",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }

    async def health_check(self) -> dict[str, Any]:
        endpoint = self.config.get("endpoint")
        if not endpoint:
            return {"status": "offline", "reason": "endpoint not configured"}

        try:
            # Normalize WS to HTTP for health check
            check_url = endpoint.replace("ws://", "http://").replace("wss://", "https://")
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(check_url.rstrip("/") + "/health")
                if response.status_code == 200:
                    return {"status": "online", "latency_ms": int(response.elapsed.total_seconds() * 1000)}
                return {"status": "offline", "code": response.status_code}
        except Exception as exc:
            return {"status": "offline", "reason": str(exc)}

    async def list_tools(self) -> list[dict]:
        return [
            {"name": "send_notification", "description": "Send notification to channel", "parameters": {"channel": "string", "message": "string"}},
            {"name": "route_message", "description": "Route message to target agent", "parameters": {"target": "string", "payload": "object"}},
            {"name": "subscribe", "description": "Subscribe to channel events", "parameters": {"channel": "string"}},
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        return await self.execute(f"Tool: {tool_name}", arguments)
