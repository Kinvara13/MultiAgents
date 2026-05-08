"""
A2A Message bus for Agent-to-Agent communication.

Provides publish/subscribe messaging and request/response patterns
for inter-agent communication, with optional Redis backend.
"""
from __future__ import annotations

import asyncio
import json
import time
from collections import defaultdict
from typing import Awaitable, Callable

from app.utils.helpers import generate_uuid, now_iso

# Type alias for message handlers
MessageHandler = Callable[[dict], Awaitable[None]]


class MessageBus:
    """In-memory message bus for A2A (Agent-to-Agent) communication.

    Supports publish/subscribe channels and request/response patterns.
    Can be backed by Redis for distributed deployments.

    Attributes:
        redis: Optional Redis client for persistent pub/sub.
        local_subscribers: In-memory subscriber registry per channel.
        _pending_requests: Tracking dict for request/response correlation.
    """

    def __init__(self, redis_client=None) -> None:
        """Initialize the message bus.

        Args:
            redis_client: Optional Redis client for cross-process messaging.
        """
        self.redis = redis_client
        self.local_subscribers: dict[str, list[MessageHandler]] = defaultdict(list)
        self._pending_requests: dict[str, asyncio.Future] = {}

    async def publish(self, channel: str, message: dict) -> int:
        """Publish a message to a channel.

        Broadcasts the message to all local subscribers. If Redis
        is configured, also publishes to the Redis channel.

        Args:
            channel: Channel name to publish to.
            message: Message payload (must be JSON-serializable dict).

        Returns:
            Number of local subscribers that received the message.

        Example:
            >>> await bus.publish("agent_events", {"type": "status_change", "agent": "claude"})
        """
        # Enrich message with metadata (keep original keys for compatibility)
        envelope = dict(message)
        envelope["_meta"] = {
            "id": generate_uuid(),
            "channel": channel,
            "timestamp": now_iso(),
        }

        # Deliver to local subscribers
        handlers = self.local_subscribers.get(channel, [])
        delivery_count = 0
        for handler in handlers:
            try:
                await handler(envelope)
                delivery_count += 1
            except Exception as exc:
                # Log but don't fail delivery to other subscribers
                print(f"[MessageBus] Subscriber error on '{channel}': {exc}")

        # Publish to Redis if available
        if self.redis:
            try:
                await self.redis.publish(channel, json.dumps(envelope))
            except Exception as exc:
                print(f"[MessageBus] Redis publish error: {exc}")

        return delivery_count

    async def subscribe(self, channel: str, handler: MessageHandler) -> None:
        """Subscribe to a channel.

        Registers an async callback that will be invoked for each
        message published to the channel.

        Args:
            channel: Channel name to subscribe to.
            handler: Async callable that receives the message envelope.

        Example:
            >>> async def on_event(msg): print(msg)
            >>> await bus.subscribe("agent_events", on_event)
        """
        self.local_subscribers[channel].append(handler)

    async def unsubscribe(self, channel: str, handler: MessageHandler) -> bool:
        """Unsubscribe a handler from a channel.

        Args:
            channel: Channel name.
            handler: Previously registered handler to remove.

        Returns:
            True if the handler was found and removed.
        """
        handlers = self.local_subscribers.get(channel, [])
        if handler in handlers:
            handlers.remove(handler)
            return True
        return False

    async def send_a2a(self, message: dict, timeout: float = 30.0) -> dict:
        """Send an A2A message and wait for a response.

        Uses a correlation ID to match responses. Creates a temporary
        subscription to a reply channel.

        Args:
            message: A2A message dict. Must contain 'recipient' and 'payload' keys.
                     Optional 'sender' key for reply routing.
            timeout: Maximum seconds to wait for response.

        Returns:
            Response message dict from the recipient agent.

        Raises:
            asyncio.TimeoutError: If no response received within timeout.
        """
        correlation_id = generate_uuid()
        reply_channel = f"reply.{correlation_id}"
        sender = message.get("sender", "unknown")
        recipient = message.get("recipient", "unknown")

        # Create a future to await the response
        response_future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_requests[correlation_id] = response_future

        async def reply_handler(envelope: dict) -> None:
            """Handle incoming reply messages."""
            payload = envelope.get("payload", {})
            if not response_future.done():
                response_future.set_result(payload)

        # Subscribe to reply channel
        await self.subscribe(reply_channel, reply_handler)

        # Publish the request
        request_envelope = {
            "id": generate_uuid(),
            "type": "a2a_request",
            "correlation_id": correlation_id,
            "sender": sender,
            "recipient": recipient,
            "reply_to": reply_channel,
            "timestamp": now_iso(),
            "payload": message.get("payload", {}),
        }

        target_channel = f"agent.{recipient}.inbox"
        await self.publish(target_channel, request_envelope)

        try:
            # Wait for response with timeout
            response = await asyncio.wait_for(response_future, timeout=timeout)
            return {
                "status": "success",
                "correlation_id": correlation_id,
                "response": response,
            }
        except asyncio.TimeoutError:
            return {
                "status": "timeout",
                "correlation_id": correlation_id,
                "error": f"No response from '{recipient}' within {timeout}s",
            }
        finally:
            # Cleanup
            self._pending_requests.pop(correlation_id, None)
            await self.unsubscribe(reply_channel, reply_handler)

    async def send_event(self, event_type: str, payload: dict, channels: list[str] | None = None) -> dict[str, int]:
        """Send an event to multiple channels.

        Convenience method for broadcasting events.

        Args:
            event_type: Type of event (e.g., 'workflow.started').
            payload: Event data.
            channels: List of channels to broadcast to. Defaults to ['all'].\n\n
        Returns:
            Dict mapping channel names to delivery counts.
        """
        channels = channels or ["all"]
        message = {"type": event_type, "data": payload}
        results = {}
        for channel in channels:
            count = await self.publish(channel, message)
            results[channel] = count
        return results

    def get_channel_stats(self) -> dict[str, int]:
        """Get subscriber counts per channel.

        Returns:
            Dict mapping channel names to subscriber counts.
        """
        return {channel: len(handlers) for channel, handlers in self.local_subscribers.items()}

    async def close(self) -> None:
        """Close the message bus and clean up resources."""
        # Cancel any pending requests
        for correlation_id, future in list(self._pending_requests.items()):
            if not future.done():
                future.cancel()
        self._pending_requests.clear()
        self.local_subscribers.clear()
