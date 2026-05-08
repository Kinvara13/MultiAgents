"""
Trae adapter for terminal/IDE-focused AI operations.

Handles terminal commands, test execution, debugging workflows,
and Git operations via natural language commands.
"""
from __future__ import annotations

import asyncio
import random
import time

try:
    import aiohttp
except ImportError:
    aiohttp = None

from app.adapters.base import BaseAdapter
from app.utils.helpers import generate_uuid, now_iso


class TraeAdapter(BaseAdapter):
    """Adapter for Trae - AI programming assistant with terminal focus.

    Specialized in terminal operations, file editing, debugging,
    and Git workflow automation.
    """

    async def execute(self, task_description: str, variables: dict) -> dict:
        """Execute a terminal/IDE-focused task on Trae.

        Generates terminal commands, test results, or debug output
        based on the task description.

        Args:
            task_description: Natural language task description.
            variables: Context variables including file paths, commands.

        Returns:
            Execution result with terminal output and metadata.
        """
        start = time.time()

        # Simulate processing (0.8-2.0 seconds for terminal tasks)
        await asyncio.sleep(random.uniform(0.8, 2.0))
        duration = int((time.time() - start) * 1000)

        # Generate terminal-focused responses
        task_lower = task_description.lower()
        if "test" in task_lower or "pytest" in task_lower or "jest" in task_lower:
            output = (
                "```\n$ pytest tests/ -v --tb=short\n\n"
                "======================== test session starts =========================\n"
                "platform linux -- Python 3.12.2, pytest-8.0.0\n"
                "rootdir: /workspace/project\n"
                "collected 47 items\n\n"
                "tests/test_auth.py::test_login PASSED                          [  2%]\n"
                "tests/test_auth.py::test_logout PASSED                         [  4%]\n"
                "tests/test_api.py::test_get_users PASSED                       [  6%]\n"
                "tests/test_api.py::test_create_user PASSED                     [  8%]\n"
                "tests/test_api.py::test_rate_limit FAILED                      [ 10%]\n"
                "  > assert response.status_code == 200\n"
                "  E assert 429 == 200\n"
                "tests/test_ws.py::test_websocket_connect PASSED                [ 85%]\n"
                "tests/test_ws.py::test_websocket_message FAILED                [ 87%]\n"
                "  > Connection closed unexpectedly\n\n"
                "45 passed, 2 failed in 2.41s\n"
                "======================== short test summary =========================\n"
                "FAILED tests/test_api.py::test_rate_limit - Rate limit exceeded\n"
                "FAILED tests/test_ws.py::test_websocket_message - Connection closed\n"
                "```"
            )
        elif "git" in task_lower or "commit" in task_lower or "branch" in task_lower:
            output = (
                "```\n$ git status\n"
                "On branch feature/user-auth\n"
                "Your branch is ahead of 'origin/feature/user-auth' by 3 commits.\n\n"
                "Changes to be committed:\n"
                "  (use \"git restore --staged <file>...\" to unstage)\n"
                "        modified:   app/auth.py\n"
                "        new file:   tests/test_auth.py\n\n"
                "Changes not staged for commit:\n"
                "  (use \"git add <file>...\" to update)\n"
                "        modified:   app/main.py\n\n"
                "$ git log --oneline -5\n"
                "a1b2c3d Add JWT token refresh\n"
                "e4f5g6h Implement password hashing\n"
                "i7j8k9l Setup auth middleware\n"
                "```\n\n"
                "Suggested commands:\n"
                "```\n"
                "git add app/main.py\n"
                "git commit -m 'Integrate auth middleware into main app'\n"
                "git push origin feature/user-auth\n"
                "```"
            )
        elif "debug" in task_lower or "error" in task_lower:
            output = (
                "## Debug Session\n\n"
                "```\n"
                "[DEBUG] 2024-01-15T09:30:00 connection_pool.py:47\n"
                "  -> Acquiring connection from pool (available: 5/20)\n\n"
                "[DEBUG] 2024-01-15T09:30:01 middleware.py:112\n"
                "  -> Processing request: GET /api/v1/users\n\n"
                "[ERROR] 2024-01-15T09:30:02 handlers.py:89\n"
                "  -> DatabaseConnectionError: connection timeout after 30s\n"
                "     File \"app/db.py\", line 45, in get_session\n"
                "       await engine.connect()\n"
                "     File \"asyncpg/connection.py\", line 412, in connect\n"
                "       raise TimeoutError(...)\n\n"
                "[WARN]  2024-01-15T09:30:02 retry.py:34\n"
                "  -> Retrying (attempt 2/3) in 1.5s...\n"
                "```\n\n"
                "**Root cause**: Database connection pool exhausted.\n"
                "**Fix**: Increase pool size or reduce connection timeout."
            )
        else:
            output = (
                "```\n$ ls -la app/\n"
                "total 48\n"
                "drwxr-xr-x 6 user user 4096 Jan 15 09:00 .\n"
                "drwxr-xr-x 8 user user 4096 Jan 15 08:50 ..\n"
                "-rw-r--r-- 1 user user  850 Jan 15 09:00 __init__.py\n"
                "-rw-r--r-- 1 user user 3200 Jan 15 09:00 main.py\n"
                "-rw-r--r-- 1 user user 2100 Jan 15 08:55 config.py\n"
                "drwxr-xr-x 2 user user 4096 Jan 15 08:55 routers\n"
                "drwxr-xr-x 2 user user 4096 Jan 15 08:55 models\n"
                "drwxr-xr-x 2 user user 4096 Jan 15 08:55 services\n\n"
                "$ find . -name '*.py' | wc -l\n"
                "24\n\n"
                "$ cloc app/\n"
                "-------------------------------------------------------------------------------\n"
                "Language                     files          blank        comment           code\n"
                "-------------------------------------------------------------------------------\n"
                "Python                          24            312            289           1847\n"
                "-------------------------------------------------------------------------------\n"
                "```"
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
        """Check Trae agent health status.

        Returns:
            Health status dict with agent info.
        """
        return {
            "status": "online",
            "agent": "trae",
            "version": "1.0.0",
            "checked_at": now_iso(),
        }

    async def list_tools(self) -> list[dict]:
        """List available MCP tools exposed by Trae.

        Returns:
            List of terminal/IDE-focused tool definitions.
        """
        return [
            {
                "name": "run_tests",
                "description": "Run test suite with specified framework and options",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "framework": {"type": "string", "enum": ["pytest", "jest", "mocha", "vitest"]},
                        "pattern": {"type": "string", "description": "Test file pattern"},
                        "options": {"type": "string", "description": "Additional CLI options"},
                    },
                    "required": ["framework"],
                },
            },
            {
                "name": "execute_command",
                "description": "Execute a terminal command and return output",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {"type": "string", "description": "Command to execute"},
                        "cwd": {"type": "string", "description": "Working directory"},
                        "timeout": {"type": "integer", "description": "Timeout in seconds", "default": 30},
                    },
                    "required": ["command"],
                },
            },
            {
                "name": "debug",
                "description": "Debug a running process or analyze error logs",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target": {"type": "string", "description": "Process name or log file path"},
                        "error": {"type": "string", "description": "Error message or description"},
                    },
                    "required": ["target"],
                },
            },
            {
                "name": "git_operations",
                "description": "Execute Git commands and analyze repository state",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {"type": "string", "description": "Git subcommand (status, log, diff, etc.)"},
                        "args": {"type": "array", "items": {"type": "string"}, "description": "Additional arguments"},
                    },
                    "required": ["command"],
                },
            },
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call a specific MCP tool on Trae.

        Args:
            tool_name: Name of the tool to invoke.
            arguments: Tool arguments.

        Returns:
            Tool execution result.
        """
        return {
            "tool": tool_name,
            "result": f"Trae executed {tool_name} with {arguments}",
            "agent": "trae",
            "timestamp": now_iso(),
        }
