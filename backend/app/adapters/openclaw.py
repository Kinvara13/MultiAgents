"""OpenClaw adapter - connects to a remote REST API endpoint."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.adapters.base import BaseAdapter


class OpenClawAdapter(BaseAdapter):
    """Production adapter for remote OpenClaw REST API.

    Configuration requires ``endpoint`` (full base URL) and
    optionally ``api_key`` for authentication.
    """

    async def execute(self, task_description: str, variables: dict | None = None) -> dict[str, Any]:
        """Send task to remote OpenClaw endpoint."""
        endpoint = self.config.get("endpoint")
        if not endpoint:
            return {
                "status": "error",
                "output": (
                    "❌ OpenClaw endpoint not configured.\n\n"
                    "Set the agent endpoint URL in Settings → Connections, e.g.:\n"
                    "  http://your-openclaw-server:3001"
                ),
                "duration_ms": 0,
            }

        api_key = self.config.get("api_key")
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "task": task_description,
            "variables": variables or {},
        }

        start = asyncio.get_event_loop().time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                url = endpoint.rstrip("/") + "/api/v1/execute"
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()

            duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
            return {
                "status": "completed",
                "output": data.get("result", data.get("output", str(data))),
                "tokens_input": data.get("tokens_input", 0),
                "tokens_output": data.get("tokens_output", 0),
                "duration_ms": duration_ms,
                "source": "openclaw-remote",
            }

        except httpx.ConnectError:
            return {
                "status": "error",
                "output": f"Cannot connect to OpenClaw at {endpoint}. Is the service running?",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }
        except httpx.HTTPStatusError as exc:
            return {
                "status": "error",
                "output": f"HTTP {exc.response.status_code}: {exc.response.text[:200]}",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }
        except Exception as exc:
            return {
                "status": "error",
                "output": f"Error: {type(exc).__name__}: {exc}",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }

    async def health_check(self) -> dict[str, Any]:
        """Check if OpenClaw endpoint is reachable."""
        endpoint = self.config.get("endpoint")
        if not endpoint:
            return {"status": "offline", "reason": "endpoint not configured"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = endpoint.rstrip("/") + "/health"
                response = await client.get(url)
                if response.status_code in (200, 204):
                    return {
                        "status": "online",
                        "latency_ms": int(response.elapsed.total_seconds() * 1000),
                    }
                return {"status": "error", "code": response.status_code}
        except Exception as exc:
            return {"status": "offline", "reason": str(exc)}

    async def list_tools(self) -> list[dict]:
        return [
            {"name": "web_scrape", "description": "Scrape web page content", "parameters": {"url": "string"}},
            {"name": "data_extract", "description": "Extract structured data", "parameters": {"source": "string", "schema": "object"}},
            {"name": "automation_run", "description": "Run automation workflow", "parameters": {"workflow_id": "string"}},
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        return await self.execute(f"Run tool: {tool_name}", arguments)
