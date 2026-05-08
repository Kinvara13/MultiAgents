"""Router registration module.

Provides a central `include_routers(app)` helper used by the main FastAPI
application to register all sub-routers in a single call.
"""

from fastapi import FastAPI

from app.routers.agents import router as agents_router
from app.routers.workflows import router as workflows_router
from app.routers.executions import router as executions_router
from app.routers.artifacts import router as artifacts_router
from app.routers.settings import router as settings_router
from app.routers.ws import router as ws_router


def include_routers(app: FastAPI) -> None:
    """Register all API routers with the FastAPI application.

    Args:
        app: The FastAPI application instance.
    """
    app.include_router(agents_router)
    app.include_router(workflows_router)
    app.include_router(executions_router)
    app.include_router(artifacts_router)
    app.include_router(settings_router)
    app.include_router(ws_router)
