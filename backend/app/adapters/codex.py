"""Codex adapter - connects to OpenAI API for code generation and refactoring."""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import httpx

from app.adapters.base import BaseAdapter

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


class CodexAdapter(BaseAdapter):
    """Production adapter for OpenAI Codex / GPT-4o via HTTP API.

    Requires ``OPENAI_API_KEY`` environment variable or ``api_key``
    in the agent configuration.
    """

    async def execute(self, task_description: str, variables: dict | None = None) -> dict[str, Any]:
        """Send coding task to OpenAI and return result."""
        api_key = self._api_key()
        if not api_key:
            return {
                "status": "error",
                "output": (
                    "❌ OpenAI API key not configured.\n\n"
                    "Set one of:\n"
                    "  • Environment variable: OPENAI_API_KEY=sk-...\n"
                    "  • Agent config API key field\n\n"
                    "Get your key at: https://platform.openai.com/api-keys"
                ),
                "tokens_input": 0,
                "tokens_output": 0,
                "duration_ms": 0,
            }

        code_context = (variables or {}).get("code", "")
        user_message = self._build_prompt(task_description, code_context)

        request_body = {
            "model": self.config.get("model", "gpt-4o"),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are Codex, an expert programming assistant. "
                        "Provide clean, well-commented code with explanations. "
                        "Always wrap code blocks in markdown triple backticks."
                    ),
                },
                {"role": "user", "content": user_message},
            ],
            "max_tokens": self.config.get("max_tokens", 4096),
            "temperature": self.config.get("temperature", 0.2),
        }

        return await self._call_openai(request_body)

    async def health_check(self) -> dict[str, Any]:
        """Check OpenAI API connectivity."""
        api_key = self._api_key()
        if not api_key:
            return {"status": "offline", "reason": "API key not configured"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if response.status_code == 200:
                    return {
                        "status": "online",
                        "api": "openai",
                        "latency_ms": int(response.elapsed.total_seconds() * 1000),
                    }
                return {"status": "error", "code": response.status_code}
        except Exception as exc:
            return {"status": "offline", "reason": str(exc)}

    async def list_tools(self) -> list[dict]:
        return [
            {
                "name": "generate_code",
                "description": "Generate code from description",
                "parameters": {"language": "string", "description": "string"},
            },
            {
                "name": "refactor_code",
                "description": "Refactor code for performance/readability",
                "parameters": {"code": "string", "goals": "string[]"},
            },
            {
                "name": "explain_code",
                "description": "Explain what code does step by step",
                "parameters": {"code": "string"},
            },
            {
                "name": "fix_bugs",
                "description": "Identify and fix bugs in code",
                "parameters": {"code": "string", "error_message": "string"},
            },
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        task = f"Execute tool '{tool_name}' with: {json.dumps(arguments)}"
        return await self.execute(task)

    # ─── helpers ─────────────────────────────────────────────

    def _api_key(self) -> str | None:
        return self.config.get("api_key") or os.environ.get("OPENAI_API_KEY")

    def _build_prompt(self, task: str, code: str) -> str:
        if code:
            return f"Task: {task}\n\n```\n{code}\n```"
        return task

    async def _call_openai(self, body: dict) -> dict[str, Any]:
        api_key = self._api_key()
        start = asyncio.get_event_loop().time()

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    OPENAI_API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
                response.raise_for_status()
                data = response.json()

            duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
            choice = data["choices"][0]

            return {
                "status": "completed",
                "output": choice["message"]["content"],
                "tokens_input": data.get("usage", {}).get("prompt_tokens", 0),
                "tokens_output": data.get("usage", {}).get("completion_tokens", 0),
                "duration_ms": duration_ms,
                "model": data.get("model"),
                "finish_reason": choice.get("finish_reason"),
            }
        except httpx.HTTPStatusError as exc:
            return {
                "status": "error",
                "output": f"OpenAI API error: {exc.response.text[:300]}",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }
        except Exception as exc:
            return {
                "status": "error",
                "output": f"Error: {type(exc).__name__}: {exc}",
                "duration_ms": int((asyncio.get_event_loop().time() - start) * 1000),
            }
