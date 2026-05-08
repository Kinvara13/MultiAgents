"""Claude adapter - connects to Anthropic API for real LLM inference."""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import httpx

from app.adapters.base import BaseAdapter

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


class ClaudeAdapter(BaseAdapter):
    """Production adapter for Anthropic Claude via HTTP API.

    Requires ``ANTHROPIC_API_KEY`` environment variable or ``api_key``
    in the agent configuration.
    """

    async def execute(self, task_description: str, variables: dict | None = None) -> dict[str, Any]:
        """Send task to Claude and return structured result."""
        api_key = self._api_key()
        if not api_key:
            return {
                "status": "error",
                "output": (
                    "❌ Claude API key not configured.\n\n"
                    "Set one of:\n"
                    "  • Environment variable: ANTHROPIC_API_KEY=sk-...\n"
                    "  • Agent config API key field\n\n"
                    "Get your key at: https://console.anthropic.com/settings/keys"
                ),
                "tokens_input": 0,
                "tokens_output": 0,
                "duration_ms": 0,
            }

        system_prompt = self._build_system_prompt(variables)
        user_content = self._render_task(task_description, variables)

        request_body = {
            "model": self.config.get("model", "claude-3-5-sonnet-20241022"),
            "max_tokens": self.config.get("max_tokens", 4096),
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_content}],
        }

        start = asyncio.get_event_loop().time()
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    ANTHROPIC_API_URL,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json=request_body,
                )
                response.raise_for_status()
                data = response.json()

            duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
            content_blocks = data.get("content", [])
            output_text = "".join(
                block.get("text", "") for block in content_blocks if block.get("type") == "text"
            )

            return {
                "status": "completed",
                "output": output_text,
                "tokens_input": data.get("usage", {}).get("input_tokens", 0),
                "tokens_output": data.get("usage", {}).get("output_tokens", 0),
                "duration_ms": duration_ms,
                "model": data.get("model", "unknown"),
                "stop_reason": data.get("stop_reason"),
            }

        except httpx.HTTPStatusError as exc:
            error_detail = self._parse_api_error(exc)
            return {
                "status": "error",
                "output": f"API error: {error_detail}",
                "tokens_input": 0,
                "tokens_output": 0,
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }
        except httpx.TimeoutException:
            return {
                "status": "error",
                "output": "Request timed out after 120s",
                "duration_ms": 120000,
            }
        except Exception as exc:
            return {
                "status": "error",
                "output": f"Unexpected error: {type(exc).__name__}: {exc}",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }

    async def health_check(self) -> dict[str, Any]:
        """Check if Anthropic API is reachable with valid credentials."""
        api_key = self._api_key()
        if not api_key:
            return {"status": "offline", "reason": "API key not configured"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Lightweight test: models endpoint
                response = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                    },
                )
                if response.status_code == 200:
                    return {
                        "status": "online",
                        "api": "anthropic",
                        "latency_ms": int(response.elapsed.total_seconds() * 1000),
                    }
                return {"status": "error", "code": response.status_code}
        except Exception as exc:
            return {"status": "offline", "reason": str(exc)}

    async def list_tools(self) -> list[dict]:
        """Return available tool definitions for MCP compatibility."""
        return [
            {
                "name": "generate_code",
                "description": "Generate code from a natural language description",
                "parameters": {"language": "string", "description": "string"},
            },
            {
                "name": "review_code",
                "description": "Review code for quality, bugs, and improvements",
                "parameters": {"code": "string", "criteria": "string[]"},
            },
            {
                "name": "write_documentation",
                "description": "Write technical documentation for given topic",
                "parameters": {"topic": "string", "format": "string"},
            },
            {
                "name": "analyze_data",
                "description": "Analyze structured data and provide insights",
                "parameters": {"data": "object", "questions": "string[]"},
            },
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Execute a tool via Claude."""
        task = f"Execute tool '{tool_name}' with arguments: {json.dumps(arguments)}"
        return await self.execute(task)

    # ─── helpers ─────────────────────────────────────────────

    def _api_key(self) -> str | None:
        return self.config.get("api_key") or os.environ.get("ANTHROPIC_API_KEY")

    def _build_system_prompt(self, variables: dict | None) -> str:
        base = (
            "You are Claude, an AI assistant integrated into AgentNexus "
            "multi-agent orchestration platform. Be concise and actionable."
        )
        if variables:
            base += f"\nContext: {json.dumps(variables, ensure_ascii=False, indent=2)}"
        return base

    def _render_task(self, description: str, variables: dict | None) -> str:
        if not variables:
            return description
        # Simple template substitution
        result = description
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        return result

    def _parse_api_error(self, exc: httpx.HTTPStatusError) -> str:
        try:
            body = exc.response.json()
            return body.get("error", {}).get("message", exc.response.text[:200])
        except Exception:
            return f"HTTP {exc.response.status_code}: {exc.response.text[:200]}"
