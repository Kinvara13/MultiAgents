"""AgentNexus FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import agents, artifacts, executions, settings as settings_router, workflows, ws
from app.services.agent_gateway import AgentGateway
from app.services.workflow_engine import WorkflowEngine

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ─── Global singletons ─────────────────────────────────────
workflow_engine = WorkflowEngine()
agent_gateway = AgentGateway()


async def _init_agents() -> None:
    """Register all agent adapters on startup."""
    from app.adapters.claude import ClaudeAdapter
    from app.adapters.codex import CodexAdapter
    from app.adapters.cursor import CursorAdapter
    from app.adapters.hermes import HermesAdapter
    from app.adapters.openclaw import OpenClawAdapter
    from app.adapters.trae import TraeAdapter

    adapter_map = {
        "claude": lambda cfg: ClaudeAdapter(cfg),
        "codex": lambda cfg: CodexAdapter(cfg),
        "trae": lambda cfg: TraeAdapter(cfg),
        "openclaw": lambda cfg: OpenClawAdapter(cfg),
        "hermes": lambda cfg: HermesAdapter(cfg),
        "cursor": lambda cfg: CursorAdapter(cfg),
    }

    for slug, factory in adapter_map.items():
        # Build config from env vars + defaults
        config: dict = {"endpoint": None, "api_key": None}
        if slug == "claude":
            config["api_key"] = settings.ANTHROPIC_API_KEY
            config["endpoint"] = "https://api.anthropic.com"
        elif slug == "codex":
            config["api_key"] = settings.OPENAI_API_KEY
            config["endpoint"] = "https://api.openai.com"
        elif slug == "trae":
            config["endpoint"] = "http://localhost:7777"
        elif slug == "openclaw":
            config["endpoint"] = "http://localhost:3001"
        elif slug == "hermes":
            config["endpoint"] = "http://localhost:3002"
        elif slug == "cursor":
            config["endpoint"] = "http://localhost:8083"

        adapter = factory(config)
        await agent_gateway.register_adapter(slug, adapter)
        logger.info("Registered adapter: %s", slug)

    workflow_engine.set_agent_gateway(agent_gateway)
    logger.info("Workflow engine initialized with agent gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # ── Startup ──
    warnings = settings.validate()
    for w in warnings:
        logger.warning("Config: %s", w)

    await _init_agents()
    logger.info("AgentNexus %s started - http://localhost:8000/docs", settings.APP_VERSION)
    yield
    # ── Shutdown ──
    logger.info("AgentNexus shutting down")


# ─── Create app ────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Multi-Agent orchestration platform API",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ────────────────────────────────────────────────
app.include_router(agents.router, prefix="/api/v1")
app.include_router(workflows.router, prefix="/api/v1")
app.include_router(executions.router, prefix="/api/v1")
app.include_router(artifacts.router, prefix="/api/v1")
app.include_router(settings_router.router, prefix="/api/v1")
app.include_router(ws.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "agents": "/api/v1/agents",
        "workflows": "/api/v1/workflows",
    }


# ─── Expose globals for route injection ────────────────────
app.state.workflow_engine = workflow_engine
app.state.agent_gateway = agent_gateway
