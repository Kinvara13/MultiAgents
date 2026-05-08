"""Agent management and invocation routes."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
router = APIRouter(tags=["agents"])

# In-memory store
_agents: dict[str, dict] = {}


def _seed_agents():
    """Seed default agent configurations."""
    defaults = [
        {
            "id": "agent-claude",
            "name": "Claude",
            "slug": "claude",
            "type": "local",
            "status": "online",
            "endpoint": "https://api.anthropic.com",
            "capabilities": ["code_generation", "code_review", "writing", "reasoning", "analysis"],
            "description": "Anthropic Claude - 通用AI助手，擅长代码生成、文档编写和推理分析",
            "icon": "MessageSquare",
            "color": "#3B82F6",
            "total_tasks": 0,
            "success_rate": 100.0,
            "created_at": _now(),
        },
        {
            "id": "agent-codex",
            "name": "Codex",
            "slug": "codex",
            "type": "local",
            "status": "online",
            "endpoint": "https://api.openai.com",
            "capabilities": ["code_completion", "code_refactoring", "code_review", "test_generation"],
            "description": "OpenAI Codex - 代码专家，专注代码生成、重构和测试",
            "icon": "Code",
            "color": "#00D4FF",
            "total_tasks": 0,
            "success_rate": 100.0,
            "created_at": _now(),
        },
        {
            "id": "agent-trae",
            "name": "Trae",
            "slug": "trae",
            "type": "local",
            "status": "offline",
            "endpoint": "http://localhost:7777",
            "capabilities": ["terminal_operation", "file_editing", "debugging", "git_operations"],
            "description": "Trae - AI编程助手，支持终端操作和文件编辑",
            "icon": "Terminal",
            "color": "#10B981",
            "total_tasks": 0,
            "success_rate": 100.0,
            "created_at": _now(),
        },
        {
            "id": "agent-openclaw",
            "name": "OpenClaw",
            "slug": "openclaw",
            "type": "remote",
            "status": "offline",
            "endpoint": "http://localhost:3001",
            "capabilities": ["web_scraping", "data_analysis", "automation"],
            "description": "OpenClaw - 远程自动化Agent，支持网页抓取和数据分析",
            "icon": "Zap",
            "color": "#8B5CF6",
            "total_tasks": 0,
            "success_rate": 100.0,
            "created_at": _now(),
        },
        {
            "id": "agent-hermes",
            "name": "Hermes",
            "slug": "hermes",
            "type": "remote",
            "status": "offline",
            "endpoint": "http://localhost:3002",
            "capabilities": ["message_routing", "notifications", "integration"],
            "description": "Hermes - 消息路由Agent，处理通知和系统集成",
            "icon": "Mail",
            "color": "#F59E0B",
            "total_tasks": 0,
            "success_rate": 100.0,
            "created_at": _now(),
        },
        {
            "id": "agent-cursor",
            "name": "Cursor",
            "slug": "cursor",
            "type": "local",
            "status": "offline",
            "endpoint": "http://localhost:8083",
            "capabilities": ["ai_programming", "code_generation", "smart_suggestions"],
            "description": "Cursor - AI编程IDE，提供智能代码建议",
            "icon": "MousePointer",
            "color": "#8B5CF6",
            "total_tasks": 0,
            "success_rate": 100.0,
            "created_at": _now(),
        },
    ]
    for a in defaults:
        _agents[a["id"]] = a


_seed_agents()


# ─── CRUD ──────────────────────────────────────────────────

@router.get("/agents")
async def list_agents(
    type: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> dict:
    items = list(_agents.values())
    if type:
        items = [a for a in items if a["type"] == type]
    if status:
        items = [a for a in items if a["status"] == status]
    if search:
        items = [a for a in items if search.lower() in a["name"].lower()]
    return {"items": items, "total": len(items), "skip": 0, "limit": 50}


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str) -> dict:
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _agents[agent_id]


@router.post("/agents")
async def create_agent(body: dict) -> dict:
    import uuid
    agent_id = str(uuid.uuid4())
    agent = {
        "id": agent_id,
        "name": body.get("name", "New Agent"),
        "slug": body.get("slug", agent_id[:8]),
        "type": body.get("type", "remote"),
        "status": "offline",
        "endpoint": body.get("endpoint"),
        "api_key": body.get("api_key"),
        "capabilities": body.get("capabilities", []),
        "description": body.get("description", ""),
        "icon": body.get("icon"),
        "color": body.get("color"),
        "total_tasks": 0,
        "success_rate": 100.0,
        "created_at": _now(),
    }
    _agents[agent_id] = agent
    return agent


@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, body: dict) -> dict:
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    for key, value in body.items():
        if value is not None:
            _agents[agent_id][key] = value
    _agents[agent_id]["updated_at"] = _now()
    return _agents[agent_id]


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str) -> dict:
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    del _agents[agent_id]
    return {"status": "deleted"}


# ─── Actions ───────────────────────────────────────────────

@router.post("/agents/{agent_id}/test")
async def test_agent(agent_id: str, request: Request) -> dict:
    """Health check the agent by calling its adapter."""
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = _agents[agent_id]
    gateway = request.app.state.agent_gateway

    try:
        result = await asyncio.wait_for(
            gateway.health_check(agent["slug"]),
            timeout=10.0,
        )
        # Update agent status based on result
        agent["status"] = result.get("status", "offline")
        agent["last_active_at"] = _now()
        return result
    except Exception as exc:
        agent["status"] = "offline"
        return {"status": "offline", "reason": str(exc)}


@router.post("/agents/{agent_id}/invoke")
async def invoke_agent(agent_id: str, body: dict, request: Request) -> dict:
    """Directly invoke an agent with a task."""
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = _agents[agent_id]
    gateway = request.app.state.agent_gateway
    task = body.get("task_description", "")
    variables = body.get("input_variables", {})

    try:
        result = await asyncio.wait_for(
            gateway.execute(agent["slug"], task, variables),
            timeout=120.0,
        )
        # Update stats
        agent["total_tasks"] = agent.get("total_tasks", 0) + 1
        agent["last_active_at"] = _now()
        if result.get("status") == "completed":
            agent["status"] = "online"
        return result
    except asyncio.TimeoutError:
        return {"status": "error", "output": "Agent invocation timed out after 120s"}
    except Exception as exc:
        return {"status": "error", "output": f"Invocation failed: {type(exc).__name__}: {exc}"}


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
