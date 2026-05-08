"""Workflow management and execution routes."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
router = APIRouter(tags=["workflows"])

# In-memory store (replace with PostgreSQL in production)
_workflows: dict[str, dict] = {}
_runs: dict[str, dict] = {}


# ─── CRUD ──────────────────────────────────────────────────

@router.get("/workflows")
async def list_workflows(status: str | None = None, search: str | None = None) -> dict:
    items = list(_workflows.values())
    if status:
        items = [w for w in items if w.get("status") == status]
    if search:
        items = [w for w in items if search.lower() in w.get("name", "").lower()]
    return {"items": items, "total": len(items), "skip": 0, "limit": 50}


@router.post("/workflows")
async def create_workflow(body: dict) -> dict:
    wf_id = str(uuid.uuid4())
    workflow = {
        "id": wf_id,
        "name": body.get("name", "Untitled"),
        "slug": body.get("slug", f"workflow-{wf_id[:8]}"),
        "description": body.get("description", ""),
        "version": body.get("version", "1.0.0"),
        "definition": body.get("definition", {"nodes": [], "edges": []}),
        "status": body.get("status", "draft"),
        "is_template": body.get("is_template", False),
        "created_at": _now(),
        "updated_at": _now(),
    }
    _workflows[wf_id] = workflow
    return workflow


@router.get("/workflows/{wf_id}")
async def get_workflow(wf_id: str) -> dict:
    if wf_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _workflows[wf_id]


@router.put("/workflows/{wf_id}")
async def update_workflow(wf_id: str, body: dict) -> dict:
    if wf_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    _workflows[wf_id].update({k: v for k, v in body.items() if v is not None})
    _workflows[wf_id]["updated_at"] = _now()
    return _workflows[wf_id]


@router.delete("/workflows/{wf_id}")
async def delete_workflow(wf_id: str) -> dict:
    if wf_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    del _workflows[wf_id]
    return {"status": "deleted"}


# ─── Validation ────────────────────────────────────────────

@router.post("/workflows/{wf_id}/validate")
async def validate_workflow(wf_id: str, request: Request) -> dict:
    if wf_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")

    from app.services.workflow_engine import WorkflowEngine
    engine = request.app.state.workflow_engine
    definition = _workflows[wf_id]["definition"]

    is_valid, errors = engine.validate_dag(definition)
    return {
        "valid": is_valid,
        "errors": errors,
        "node_count": len(definition.get("nodes", [])),
        "edge_count": len(definition.get("edges", [])),
    }


# ─── Execution ─────────────────────────────────────────────

@router.post("/workflows/{wf_id}/run")
async def run_workflow(wf_id: str, body: dict | None = None, request: Request | None = None) -> dict:
    """Start workflow execution as a background task.

    Returns immediately with run_id. Poll GET /runs/{run_id} for status,
    or connect to WebSocket for real-time updates.
    """
    if wf_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = _workflows[wf_id]
    definition = workflow["definition"]
    inputs = (body or {}).get("inputs", {})
    run_id = str(uuid.uuid4())
    thread_id = str(uuid.uuid4())

    # Store run metadata
    _runs[run_id] = {
        "id": run_id,
        "workflow_id": wf_id,
        "thread_id": thread_id,
        "status": "running",
        "inputs": inputs,
        "outputs": {},
        "started_at": _now(),
    }

    # Start execution as background task
    engine = request.app.state.workflow_engine if request else WorkflowEngine()

    async def on_event(event: dict) -> None:
        """Event callback to update run state."""
        if event.get("run_id") == run_id:
            if event["type"] == "node.completed":
                if run_id in _runs:
                    _runs[run_id].setdefault("node_outputs", {})[event["node_id"]] = event.get("output", "")
            elif event["type"] in ("workflow.completed", "workflow.failed"):
                if run_id in _runs:
                    _runs[run_id]["status"] = "completed" if event["type"] == "workflow.completed" else "failed"
                    _runs[run_id]["completed_at"] = _now()

    engine.on_event(on_event)

    # Fire and forget
    engine.start_execution(definition, inputs, run_id, thread_id)

    logger.info("Started workflow run %s for workflow %s", run_id, wf_id)
    return {
        "run_id": run_id,
        "status": "running",
        "message": "Workflow started. Poll GET /api/v1/runs/{run_id} for status.",
    }


@router.get("/workflows/{wf_id}/runs")
async def get_workflow_runs(wf_id: str) -> dict:
    items = [r for r in _runs.values() if r["workflow_id"] == wf_id]
    return {"items": items, "total": len(items), "skip": 0, "limit": 50}


# ─── Run management ────────────────────────────────────────

@router.get("/runs/{run_id}")
async def get_run(run_id: str) -> dict:
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail="Run not found")
    return _runs[run_id]


@router.post("/runs/{run_id}/pause")
async def pause_run(run_id: str, request: Request) -> dict:
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail="Run not found")
    engine = request.app.state.workflow_engine
    await engine.pause_run(run_id)
    _runs[run_id]["status"] = "paused"
    return {"status": "paused"}


@router.post("/runs/{run_id}/resume")
async def resume_run(run_id: str, request: Request) -> dict:
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail="Run not found")
    engine = request.app.state.workflow_engine
    await engine.resume_run(run_id)
    _runs[run_id]["status"] = "running"
    return {"status": "running"}


@router.post("/runs/{run_id}/cancel")
async def cancel_run(run_id: str, request: Request) -> dict:
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail="Run not found")
    engine = request.app.state.workflow_engine
    await engine.cancel_run(run_id)
    _runs[run_id]["status"] = "cancelled"
    return {"status": "cancelled"}


# ─── Helpers ───────────────────────────────────────────────

def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


# Seed default workflows on module load
_seed_workflows()

def _seed_workflows():
    """Create default workflow templates."""
    defaults = [
        {
            "id": "wf-code-review",
            "name": "代码审查流水线",
            "slug": "code-review-pipeline",
            "description": "自动代码审查：获取代码 -> Claude审查 -> Codex重构 -> 产出报告",
            "definition": {
                "nodes": [
                    {"id": "start", "type": "start", "data": {}},
                    {"id": "fetch", "type": "claude", "data": {"config": {"agent": {"taskDescription": "获取并理解代码文件内容", "timeout": 60}}}},
                    {"id": "review", "type": "claude", "data": {"config": {"agent": {"taskDescription": "审查代码质量、安全性和风格问题:\n{{inputs.code}}", "timeout": 120}}}},
                    {"id": "refactor", "type": "codex", "data": {"config": {"agent": {"taskDescription": "根据审查意见重构代码", "timeout": 120}}}},
                    {"id": "end", "type": "end", "data": {}},
                ],
                "edges": [
                    {"id": "e1", "source": "start", "target": "fetch"},
                    {"id": "e2", "source": "fetch", "target": "review"},
                    {"id": "e3", "source": "review", "target": "refactor"},
                    {"id": "e4", "source": "refactor", "target": "end"},
                ],
            },
        },
        {
            "id": "wf-research",
            "name": "多Agent研究分析",
            "slug": "multi-agent-research",
            "description": "多个Agent并行研究同一主题，最后综合汇总",
            "definition": {
                "nodes": [
                    {"id": "start", "type": "start", "data": {}},
                    {"id": "parallel", "type": "parallel", "data": {}},
                    {"id": "claude_research", "type": "claude", "data": {"config": {"agent": {"taskDescription": "从理论角度研究:\n{{inputs.topic}}", "timeout": 120}}}},
                    {"id": "codex_research", "type": "codex", "data": {"config": {"agent": {"taskDescription": "从实现角度研究:\n{{inputs.topic}}", "timeout": 120}}}},
                    {"id": "openclaw_research", "type": "openclaw", "data": {"config": {"agent": {"taskDescription": "搜索网络资源:\n{{inputs.topic}}", "timeout": 120}}}},
                    {"id": "merge", "type": "merge", "data": {}},
                    {"id": "end", "type": "end", "data": {}},
                ],
                "edges": [
                    {"id": "e1", "source": "start", "target": "parallel"},
                    {"id": "e2", "source": "parallel", "target": "claude_research"},
                    {"id": "e3", "source": "parallel", "target": "codex_research"},
                    {"id": "e4", "source": "parallel", "target": "openclaw_research"},
                    {"id": "e5", "source": "claude_research", "target": "merge"},
                    {"id": "e6", "source": "codex_research", "target": "merge"},
                    {"id": "e7", "source": "openclaw_research", "target": "merge"},
                    {"id": "e8", "source": "merge", "target": "end"},
                ],
            },
        },
        {
            "id": "wf-data-pipeline",
            "name": "数据处理管道",
            "slug": "data-processing-pipeline",
            "description": "数据抓取 -> 清洗 -> 分析 -> 报告",
            "definition": {
                "nodes": [
                    {"id": "start", "type": "start", "data": {}},
                    {"id": "scrape", "type": "openclaw", "data": {"config": {"agent": {"taskDescription": "抓取数据源: {{inputs.url}}", "timeout": 120}}}},
                    {"id": "clean", "type": "claude", "data": {"config": {"agent": {"taskDescription": "清洗和规范化数据", "timeout": 90}}}},
                    {"id": "analyze", "type": "codex", "data": {"config": {"agent": {"taskDescription": "数据分析并生成可视化脚本", "timeout": 120}}}},
                    {"id": "end", "type": "end", "data": {}},
                ],
                "edges": [
                    {"id": "e1", "source": "start", "target": "scrape"},
                    {"id": "e2", "source": "scrape", "target": "clean"},
                    {"id": "e3", "source": "clean", "target": "analyze"},
                    {"id": "e4", "source": "analyze", "target": "end"},
                ],
            },
        },
    ]
    for wf in defaults:
        _workflows[wf["id"]] = wf
