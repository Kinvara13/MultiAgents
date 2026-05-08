"""
AgentNexus Backend - FastAPI Application Entry Point.

Provides the main FastAPI application with:
- Lifecycle management (startup/shutdown)
- CORS middleware configuration
- Health check endpoint
- Router registration
- WebSocket support for real-time communication
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# NOTE: These imports assume the referenced modules exist in the project.
# They are commented out here to allow the app to start in isolation.
# Uncomment when the corresponding modules are implemented:
#
# from app.config import settings
# from app.database import init_db
# from app.routers import include_routers

# Placeholder for when config module is available
class _Settings:
    """Temporary settings placeholder."""
    APP_NAME = "AgentNexus"
    APP_VERSION = "0.1.0"
    cors_origin_list = ["http://localhost:3000", "http://localhost:5173"]


settings = _Settings()


# Store active WebSocket connections for broadcasting
class ConnectionManager:
    """Manages active WebSocket connections for real-time updates."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket) -> None:
        """Send a message to a specific client."""
        await websocket.send_text(message)

    async def broadcast(self, message: str) -> None:
        """Broadcast a message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        # Clean up dead connections
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager handling startup and shutdown.

    Startup:
        - Initialize database connections
        - Set up message bus
        - Register MCP servers

    Shutdown:
        - Close database connections
        - Clean up adapter sessions
        - Close WebSocket connections
    """
    # --- Startup ---
    # TODO: Uncomment when database module is ready
    # await init_db()

    # Initialize adapters
    # adapters = create_adapters()
    # app.state.adapters = adapters

    # Initialize message bus
    # from app.core.message_bus import MessageBus
    # app.state.message_bus = MessageBus()

    # Initialize MCP registry
    # from app.core.mcp import MCPServerRegistry
    # app.state.mcp_registry = MCPServerRegistry()

    print(f"[AgentNexus] {settings.APP_NAME} v{settings.APP_VERSION} started")
    yield
    # --- Shutdown ---
    # Close all adapter sessions
    # if hasattr(app.state, "adapters"):
    #     for slug, adapter in app.state.adapters.items():
    #         await adapter.close()

    # Close WebSocket connections
    for ws in manager.active_connections:
        try:
            await ws.close()
        except Exception:
            pass
    manager.active_connections.clear()

    print(f"[AgentNexus] {settings.APP_NAME} v{settings.APP_VERSION} stopped")


# Create the FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AgentNexus - Multi-Agent Workflow Platform Backend API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Health Check ----
@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Health check endpoint.

    Returns:
        Application health status and version info.
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME,
    }


@app.get("/health/detailed", tags=["health"])
async def health_check_detailed() -> dict:
    """Detailed health check with adapter and system status.

    Returns:
        Comprehensive health status including all adapter states.
    """
    # TODO: Check actual adapter health when adapters are initialized
    adapters_status = {
        "claude": {"status": "online", "type": "local"},
        "codex": {"status": "online", "type": "local"},
        "trae": {"status": "offline", "type": "local"},
        "openclaw": {"status": "online", "type": "remote"},
        "hermes": {"status": "online", "type": "remote"},
        "cursor": {"status": "online", "type": "local"},
    }
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME,
        "adapters": adapters_status,
    }


# ---- WebSocket Endpoint ----
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str) -> None:
    """WebSocket endpoint for real-time communication.

    Clients connect with a unique client_id to receive live updates
    about workflow execution, agent status changes, and notifications.

    Args:
        websocket: The WebSocket connection.
        client_id: Unique client identifier.
    """
    await manager.connect(websocket)
    try:
        # Send welcome message
        await manager.send_personal_message(
            f'{{"type": "connected", "client_id": "{client_id}"}}',
            websocket,
        )

        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()

            # Echo back with acknowledgment
            await manager.send_personal_message(
                f'{{"type": "ack", "received": "{data}"}}',
                websocket,
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        print(f"[WebSocket] Error for client {client_id}: {exc}")
        manager.disconnect(websocket)


# ---- Exception Handlers ----
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc: Exception) -> JSONResponse:
    """Handle unhandled exceptions gracefully."""
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ---- Router Registration ----
# TODO: Uncomment when routers module is ready
# include_routers(app)

# If no routers are registered yet, add a root endpoint
@app.get("/", tags=["root"])
async def root() -> dict:
    """Root endpoint with API info.

    Returns:
        Basic API information.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "websocket": "/ws/{client_id}",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
