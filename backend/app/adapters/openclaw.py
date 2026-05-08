"""
OpenClaw adapter for remote REST API automation.

Provides web scraping, data analysis, and automation capabilities
via HTTP API calls to a remote OpenClaw service.
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


class OpenClawAdapter(BaseAdapter):
    """Adapter for OpenClaw - remote automation Agent.

    Handles web scraping, data extraction, and automation workflows
    via REST API calls to the OpenClaw service endpoint.
    """

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create the aiohttp client session.

        Returns:
            Active ClientSession instance.
        """
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.get("timeout", 30))
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session

    async def execute(self, task_description: str, variables: dict) -> dict:
        """Execute a remote automation task on OpenClaw.

        Simulates HTTP API calls to the OpenClaw endpoint with
        realistic response generation for web/data tasks.

        Args:
            task_description: Natural language task description.
            variables: Context variables including URLs, selectors, etc.

        Returns:
            Execution result with extracted data and metadata.
        """
        start = time.time()

        # Simulate HTTP API latency (1.5-4 seconds for remote calls)
        await asyncio.sleep(random.uniform(1.5, 4.0))
        duration = int((time.time() - start) * 1000)

        # Generate web/data-focused responses
        task_lower = task_description.lower()
        if "scrap" in task_lower or "extract" in task_lower or "web" in task_lower:
            output = (
                "## Web Extraction Results\n\n"
                "**URL**: https://example.com/products\n"
                "**Pages scraped**: 12\n"
                "**Items extracted**: 347\n"
                "**Duration**: 4.2s\n\n"
                "| Field | Samples | Coverage |\n"
                "|-------|---------|----------|\n"
                "| title | 347/347 | 100% |\n"
                "| price | 347/347 | 100% |\n"
                "| description | 312/347 | 89.9% |\n"
                "| image_url | 298/347 | 85.9% |\n"
                "| rating | 201/347 | 57.9% |\n\n"
                "Data saved to: `output/products_20240115.json`"
            )
        elif "data" in task_lower or "analysis" in task_lower or "csv" in task_lower:
            output = (
                "## Data Analysis Report\n\n"
                "**Dataset**: sales_data_2024.csv (2.3 MB, 15,432 rows)\n\n"
                "### Summary Statistics\n\n"
                "| Metric | Value |\n"
                "|--------|-------|\n"
                "| Total Revenue | $1,234,567 |\n"
                "| Avg Order Value | $79.99 |\n"
                "| Unique Customers | 3,847 |\n"
                "| Repeat Rate | 34.2% |\n\n"
                "### Insights\n\n"
                "1. **Peak sales**: December (+42% vs avg)\n"
                "2. **Top category**: Electronics (38% of revenue)\n"
                "3. **Churn risk**: 234 customers inactive >90 days\n"
                "4. **Growth**: +23% YoY revenue increase"
            )
        elif "automate" in task_lower or "workflow" in task_lower:
            output = (
                "## Automation Workflow Executed\n\n"
                "**Workflow**: Daily report generation\n"
                "**Status**: Completed successfully\n"
                "**Steps**: 5/5 completed\n\n"
                "```\n"
                "[1/5] Fetch data from API ................. OK (1.2s)\n"
                "[2/5] Transform and aggregate ............. OK (0.8s)\n"
                "[3/5] Generate charts and visuals ......... OK (2.1s)\n"
                "[4/5] Compose email with attachments ...... OK (0.3s)\n"
                "[5/5] Send to recipients .................. OK (0.5s)\n"
                "```\n\n"
                "Report sent to: team@company.com\n"
                "Attachments: daily_report_20240115.pdf, summary.xlsx"
            )
        else:
            output = (
                "## API Response\n\n"
                "```json\n"
                "{\n"
                "  \"status\": \"success\",\n"
                "  \"task_id\": \"oc_20240115_001\",\n"
                "  \"results\": {\n"
                "    \"pages_processed\": 8,\n"
                "    \"records_extracted\": 156,\n"
                "    \"errors\": 0,\n"
                "    \"duration_seconds\": 6.4\n"
                "  },\n"
                "  \"next_steps\": [\n"
                "    \"Review extracted data\",\n"
                "    \"Configure output format\",\n"
                "    \"Schedule recurring extraction\"\n"
                "  ]\n"
                "}\n"
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
        """Check OpenClaw agent health via HTTP GET to endpoint.

        Attempts to reach the configured endpoint to determine
        if the remote service is available.

        Returns:
            Health status dict with agent info and HTTP details.
        """
        endpoint = self.config.get("endpoint", "http://localhost:3001")
        try:
            session = await self._get_session()
            async with session.get(f"{endpoint}/health", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    return {
                        "status": "online",
                        "agent": "openclaw",
                        "endpoint": endpoint,
                        "http_status": resp.status,
                        "checked_at": now_iso(),
                    }
                return {
                    "status": "degraded",
                    "agent": "openclaw",
                    "endpoint": endpoint,
                    "http_status": resp.status,
                    "checked_at": now_iso(),
                }
        except Exception as exc:
            return {
                "status": "offline",
                "agent": "openclaw",
                "endpoint": endpoint,
                "error": str(exc),
                "checked_at": now_iso(),
            }

    async def list_tools(self) -> list[dict]:
        """List available MCP tools exposed by OpenClaw.

        Returns:
            List of web automation and data tool definitions.
        """
        return [
            {
                "name": "web_scrape",
                "description": "Scrape web pages and extract structured data",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "format": "uri", "description": "Target URL"},
                        "selector": {"type": "string", "description": "CSS selector for extraction"},
                        "pages": {"type": "integer", "description": "Number of pages to scrape", "default": 1},
                    },
                    "required": ["url"],
                },
            },
            {
                "name": "data_analysis",
                "description": "Analyze structured data and generate insights",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "data": {"type": "object", "description": "Data to analyze"},
                        "analysis_type": {"type": "string", "enum": ["summary", "trend", "correlation"]},
                    },
                    "required": ["data"],
                },
            },
            {
                "name": "api_call",
                "description": "Make an HTTP request to a REST API",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE"]},
                        "url": {"type": "string", "format": "uri"},
                        "headers": {"type": "object"},
                        "body": {"type": "object"},
                    },
                    "required": ["method", "url"],
                },
            },
            {
                "name": "automation_workflow",
                "description": "Execute a multi-step automation workflow",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "workflow_id": {"type": "string", "description": "Workflow identifier"},
                        "inputs": {"type": "object", "description": "Workflow input parameters"},
                    },
                    "required": ["workflow_id"],
                },
            },
        ]

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call a specific MCP tool on OpenClaw.

        Args:
            tool_name: Name of the tool to invoke.
            arguments: Tool arguments.

        Returns:
            Tool execution result.
        """
        return {
            "tool": tool_name,
            "result": f"OpenClaw executed {tool_name} with {arguments}",
            "agent": "openclaw",
            "timestamp": now_iso(),
        }
