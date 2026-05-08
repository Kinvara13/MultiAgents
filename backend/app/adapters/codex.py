"""
Codex adapter for OpenAI's Codex API.

Specialized in code-focused operations including code generation,
refactoring, review, and test generation.
"""
from __future__ import annotations

import asyncio
import random
import time

from app.adapters.base import BaseAdapter
from app.utils.helpers import generate_uuid, now_iso


class CodexAdapter(BaseAdapter):
    """Adapter for OpenAI Codex - code expert agent.

    Optimized for software engineering tasks including code completion,
    refactoring, review, and automated test generation.
    """

    async def execute(self, task_description: str, variables: dict) -> dict:
        """Execute a code-focused task on Codex.

        Generates code snippets, refactoring suggestions, or test cases
        based on the task description and provided variables.

        Args:
            task_description: Natural language task description.
            variables: Context variables including code context.

        Returns:
            Execution result with code output and metadata.
        """
        start = time.time()

        # Simulate processing (0.5-2.5 seconds for code tasks)
        await asyncio.sleep(random.uniform(0.5, 2.5))
        duration = int((time.time() - start) * 1000)

        # Generate code-focused responses
        task_lower = task_description.lower()
        if "refactor" in task_lower or "refactoring" in task_lower:
            output = (
                "## Refactoring Suggestions\n\n"
                "```python\n"
                "# Before\ndef process(data):\n"
                "    result = []\n"
                "    for item in data:\n"
                "        if item.active:\n"
                "            result.append(transform(item))\n"
                "    return result\n\n"
                "# After\nfrom functools import partial\n\n"
                "def process(data):\n"
                "    return [transform(item) for item in data if item.active]\n"
                "```\n\n"
                "- Extracted list comprehension for clarity\n"
                "- Reduced cyclomatic complexity from 4 to 1\n"
                "- Performance improvement: ~15% faster for large datasets"
            )
        elif "test" in task_lower or "tests" in task_lower:
            output = (
                "## Generated Tests\n\n"
                "```python\n"
                "import pytest\n"
                "from unittest.mock import Mock, patch\n\n"
                "class TestUserService:\n"
                "    @pytest.mark.asyncio\n"
                "    async def test_create_user_success(self):\n"
                "        service = UserService()\n"
                "        user = await service.create({'name': 'Alice', 'email': 'alice@example.com'})\n"
                "        assert user.id is not None\n"
                "        assert user.name == 'Alice'\n\n"
                "    @pytest.mark.asyncio\n"
                "    async def test_create_user_duplicate_email(self):\n"
                "        service = UserService()\n"
                "        with pytest.raises(DuplicateError):\n"
                "            await service.create({'name': 'Bob', 'email': 'alice@example.com'})\n"
                "```"
            )
        elif "generate" in task_lower or "code" in task_lower:
            output = (
                "## Generated Code\n\n"
                "```python\n"
                "from fastapi import APIRouter, Depends, HTTPException\n"
                "from sqlalchemy.ext.asyncio import AsyncSession\n\n"
                "router = APIRouter(prefix='/api/v1/users')\n\n"
                "@router.get('/{user_id}')\n"
                "async def get_user(\n"
                "    user_id: UUID,\n"
                "    db: AsyncSession = Depends(get_db)\n"
                "): -> UserResponse:\n"
                "    user = await db.get(User, user_id)\n"
                "    if not user:\n"
                "        raise HTTPException(status_code=404, detail='User not found')\n"
                "    return UserResponse.model_validate(user)\n"
                "```\n\n"
                "- Includes proper type hints and validation\n"
                "- Handles error cases with appropriate HTTP status codes\n"
                "- Uses async/await for non-blocking database access"
            )
        else:
            output = (
                "## Code Analysis\n\n"
                "```python\n"
                "# Suggested implementation\n"
                "async def handle_request(request: Request) -> Response:\n"
                "    try:\n"
                "        validated = await validate(request)\n"
                "        result = await process(validated)\n"
                "        return success_response(result)\n"
                "    except ValidationError as e:\n"
                "        return error_response(400, str(e))\n"
                "    except Exception as e:\n"
                "        logger.exception('Unhandled error')\n"
                "        return error_response(500, 'Internal error')\n"
                "```\n\n"
                "Code quality score: 92/100\n"
                "- Proper error handling with specific exceptions\n"
                "- Structured logging for debugging\n"
                "- Async pattern for I/O operations"
            )

        return {
            "output": output,
            "tokens_input": len(task_description) // 4 + len(str(variables)) // 8,
            "tokens_output": len(output) // 4,
            "duration_ms": duration,
            "status": "completed",
            "run_id": generate_uuid(),
            "completed_at": now_iso(),
        }

    async def health_check(self) -> dict:
        """Check Codex agent health status.

        Returns:
            Health status dict with agent info.
        """
        return {
            "status": "online",
            "agent": "codex",
            "version": "2024-05",
            "checked_at": now_iso(),
        }

    async def list_tools(self) -> list[dict]:
        """List available MCP tools exposed by Codex.

        Returns:
            List of code-focused tool definitions.
        """
        return [
            {
                "name": "code_generation",
                "description": "Generate code from a natural language description",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "language": {"type": "string", "description": "Target programming language"},
                        "description": {"type": "string", "description": "Code requirements"},
                        "context": {"type": "string", "description": "Existing code context (optional)"},
                    },
                    "required": ["language", "description"],
                },
            },
            {
                "name": "code_refactor",
                "description": "Refactor code for improved quality and performance",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Code to refactor"},
                        "goals": {"type": "array", "items": {"type": "string"}, "description": "Refactoring goals"},
                    },
                    "required": ["code"],
                },
            },
            {
                "name": "code_explain",
                "description": "Explain what a piece of code does",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Code to explain"},
                    },
                    "required": ["code"],
                },
            },
            {
                "name": "bug_fix",
                "description": "Identify and fix bugs in code",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Code with potential bugs"},
                        "error": {"type": "string", "description": "Error message or description"},
                    },
                    "required": ["code"],
                },
            },
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call a specific MCP tool on Codex.

        Args:
            tool_name: Name of the tool to invoke.
            arguments: Tool arguments.

        Returns:
            Tool execution result.
        """
        return {
            "tool": tool_name,
            "result": f"Codex executed {tool_name} with {arguments}",
            "agent": "codex",
            "timestamp": now_iso(),
        }
