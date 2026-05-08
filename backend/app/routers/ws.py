"""WebSocket endpoint for real-time workflow events."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time workflow execution events.

    Messages:
        Client -> Server:
            {"type": "subscribe", "run_id": "<uuid>"}
            {"type": "unsubscribe", "run_id": "<uuid>"}

        Server -> Client:
            {"type": "node.started", "run_id": "...", "node_id": "..."}
            {"type": "node.completed", "run_id": "...", "node_id": "...", ...}
            {"type": "workflow.completed", "run_id": "..."}
    """
    await websocket.accept()
    subscribed_runs: set[str] = set()
    heartbeat_task: asyncio.Task | None = None

    # Get engine from app state
    from starlette.requests import HTTPConnection
    app = websocket.app
    engine = app.state.workflow_engine if hasattr(app.state, "workflow_engine") else None

    async def on_event(event: dict) -> None:
        """Forward engine events to WebSocket client."""
        run_id = event.get("run_id")
        if run_id in subscribed_runs:
            try:
                await websocket.send_json(event)
            except Exception:
                pass  # Client disconnected

    async def heartbeat() -> None:
        """Send periodic ping to keep connection alive."""
        while True:
            await asyncio.sleep(30)
            try:
                await websocket.send_json({"type": "ping", "timestamp": _now()})
            except Exception:
                break

    if engine:
        engine.on_event(on_event)

    heartbeat_task = asyncio.create_task(heartbeat())

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")
            if msg_type == "subscribe":
                run_id = msg.get("run_id")
                if run_id:
                    subscribed_runs.add(run_id)
                    await websocket.send_json({"type": "subscribed", "run_id": run_id})
            elif msg_type == "unsubscribe":
                run_id = msg.get("run_id")
                subscribed_runs.discard(run_id)
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({"type": "error", "message": f"Unknown type: {msg_type}"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    finally:
        if heartbeat_task and not heartbeat_task.done():
            heartbeat_task.cancel()
        subscribed_runs.clear()


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
