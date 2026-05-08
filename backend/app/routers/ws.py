"""WebSocket endpoint for real-time event streaming.

Provides a WebSocket connection handler that supports authentication,
channel-based subscriptions, heartbeat ping/pong, and structured event
publishing for workflow execution updates.
"""

import asyncio
import json
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from starlette.websockets import WebSocketState

from app.config import get_settings

router = APIRouter(tags=["websocket"])

# Connection registry: {websocket_id -> WebSocket}
_connections: Dict[str, WebSocket] = {}

# Subscription registry: {channel -> {websocket_id}}
_subscriptions: Dict[str, Set[str]] = {}

# Authenticated connection tracking: {websocket_id -> is_authenticated}
_authenticated: Dict[str, bool] = {}


class ConnectionManager:
    """Manages WebSocket connections, subscriptions, and event broadcasting."""

    def __init__(self) -> None:
        self._connections: Dict[str, WebSocket] = {}
        self._subscriptions: Dict[str, Set[str]] = {}
        self._authenticated: Dict[str, bool] = {}

    async def connect(self, websocket: WebSocket) -> str:
        """Accept a new WebSocket connection.

        Args:
            websocket: The incoming WebSocket connection.

        Returns:
            The connection's unique identifier.
        """
        await websocket.accept()
        connection_id = str(id(websocket))
        self._connections[connection_id] = websocket
        self._authenticated[connection_id] = False
        return connection_id

    def disconnect(self, connection_id: str) -> None:
        """Remove a connection and all its subscriptions.

        Args:
            connection_id: The connection's unique identifier.
        """
        self._connections.pop(connection_id, None)
        self._authenticated.pop(connection_id, None)

        # Clean up subscriptions
        for channel in list(self._subscriptions.keys()):
            self._subscriptions[channel].discard(connection_id)
            if not self._subscriptions[channel]:
                del self._subscriptions[channel]

    def authenticate(self, connection_id: str) -> None:
        """Mark a connection as authenticated.

        Args:
            connection_id: The connection's unique identifier.
        """
        self._authenticated[connection_id] = True

    def is_authenticated(self, connection_id: str) -> bool:
        """Check if a connection is authenticated.

        Args:
            connection_id: The connection's unique identifier.

        Returns:
            True if authenticated, False otherwise.
        """
        return self._authenticated.get(connection_id, False)

    def subscribe(self, connection_id: str, channel: str) -> None:
        """Subscribe a connection to a channel.

        Args:
            connection_id: The connection's unique identifier.
            channel: The channel name to subscribe to.
        """
        if channel not in self._subscriptions:
            self._subscriptions[channel] = set()
        self._subscriptions[channel].add(connection_id)

    def unsubscribe(self, connection_id: str, channel: str) -> None:
        """Unsubscribe a connection from a channel.

        Args:
            connection_id: The connection's unique identifier.
            channel: The channel name to unsubscribe from.
        """
        if channel in self._subscriptions:
            self._subscriptions[channel].discard(connection_id)
            if not self._subscriptions[channel]:
                del self._subscriptions[channel]

    async def send_to(self, connection_id: str, message: dict) -> None:
        """Send a message to a specific connection.

        Args:
            connection_id: The target connection's unique identifier.
            message: The JSON-serializable message payload.
        """
        ws = self._connections.get(connection_id)
        if ws and ws.client_state == WebSocketState.CONNECTED:
            await ws.send_json(message)

    async def broadcast(self, channel: str, message: dict) -> None:
        """Broadcast a message to all subscribers of a channel.

        Args:
            channel: The channel to broadcast on.
            message: The JSON-serializable message payload.
        """
        connection_ids = self._subscriptions.get(channel, set()).copy()
        for cid in connection_ids:
            ws = self._connections.get(cid)
            if ws and ws.client_state == WebSocketState.CONNECTED:
                try:
                    await ws.send_json(message)
                except Exception:
                    # Connection may have closed; clean up on disconnect
                    pass

    async def send_ping(self, connection_id: str) -> None:
        """Send a ping heartbeat to a connection.

        Args:
            connection_id: The target connection's unique identifier.
        """
        await self.send_to(
            connection_id,
            {
                "type": "ping",
                "timestamp": asyncio.get_event_loop().time(),
            },
        )

    def connection_count(self) -> int:
        """Return the total number of active connections.

        Returns:
            Number of connected clients.
        """
        return len(self._connections)


_manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Main WebSocket endpoint for real-time event streaming.

    Connection lifecycle:
        1. Client connects -> connection accepted.
        2. Client sends auth message -> connection authenticated.
        3. Client sends subscribe messages -> joins channels.
        4. Server pushes events for subscribed channels.
        5. Heartbeat ping every 30s; client expected to respond with pong.
        6. Client disconnects -> cleanup.

    Expected message formats:

    Auth:
        {"type": "auth", "token": "<jwt-token>"}

    Subscribe:
        {"type": "subscribe", "channel": "workflow:<run_id>"}

    Unsubscribe:
        {"type": "unsubscribe", "channel": "workflow:<run_id>"}

    Pong (response to server ping):
        {"type": "pong"}

    Server push events:
        {"type": "node.started", "timestamp": "...", "payload": {...}}
        {"type": "node.completed", "timestamp": "...", "payload": {...}}
        {"type": "node.failed", "timestamp": "...", "payload": {...}}

    Args:
        websocket: The WebSocket connection instance.
    """
    connection_id = await _manager.connect(websocket)
    settings = get_settings()
    heartbeat_interval = settings.WS_HEARTBEAT_INTERVAL

    try:
        # Main message loop
        while True:
            # Wait for next message with a timeout for heartbeat checks
            try:
                raw_message = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=heartbeat_interval,
                )
            except asyncio.TimeoutError:
                # Send heartbeat ping
                if websocket.client_state == WebSocketState.CONNECTED:
                    await _manager.send_ping(connection_id)
                continue

            # Parse incoming message
            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                await _manager.send_to(
                    connection_id,
                    {
                        "type": "error",
                        "message": "Invalid JSON",
                    },
                )
                continue

            msg_type = message.get("type")

            # Handle authentication
            if msg_type == "auth":
                token = message.get("token", "")
                # Mock auth: accept all tokens for now
                # In production, validate JWT here
                if token or True:  # Accept all connections in mock mode
                    _manager.authenticate(connection_id)
                    await _manager.send_to(
                        connection_id,
                        {
                            "type": "auth.success",
                            "message": "Authenticated successfully",
                            "connection_id": connection_id,
                        },
                    )
                else:
                    await _manager.send_to(
                        connection_id,
                        {
                            "type": "auth.error",
                            "message": "Invalid token",
                        },
                    )
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                    return

            # Handle subscription
            elif msg_type == "subscribe":
                if not _manager.is_authenticated(connection_id):
                    await _manager.send_to(
                        connection_id,
                        {
                            "type": "error",
                            "message": "Not authenticated. Send auth message first.",
                        },
                    )
                    continue

                channel = message.get("channel", "")
                if channel:
                    _manager.subscribe(connection_id, channel)
                    await _manager.send_to(
                        connection_id,
                        {
                            "type": "subscribed",
                            "channel": channel,
                        },
                    )
                else:
                    await _manager.send_to(
                        connection_id,
                        {
                            "type": "error",
                            "message": "Channel name required",
                        },
                    )

            # Handle unsubscription
            elif msg_type == "unsubscribe":
                channel = message.get("channel", "")
                if channel:
                    _manager.unsubscribe(connection_id, channel)
                    await _manager.send_to(
                        connection_id,
                        {
                            "type": "unsubscribed",
                            "channel": channel,
                        },
                    )

            # Handle heartbeat pong
            elif msg_type == "pong":
                # Pong received; connection is alive
                pass

            # Unknown message type
            else:
                await _manager.send_to(
                    connection_id,
                    {
                        "type": "error",
                        "message": f"Unknown message type: {msg_type}",
                    },
                )

    except WebSocketDisconnect:
        pass
    except Exception:
        # Any other error; close gracefully
        pass
    finally:
        _manager.disconnect(connection_id)


async def publish_event(channel: str, event_type: str, payload: dict) -> None:
    """Publish an event to all subscribers of a channel.

    This helper is intended for use by the workflow engine and other
    services to push real-time updates to connected WebSocket clients.

    Args:
        channel: The channel to publish on (e.g., 'workflow:<run_id>').
        event_type: The event type (e.g., 'node.started', 'node.completed').
        payload: Event-specific data payload.
    """
    import datetime

    message = {
        "type": event_type,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "payload": payload,
    }
    await _manager.broadcast(channel, message)
