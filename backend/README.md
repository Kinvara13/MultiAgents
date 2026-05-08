# AgentNexus Backend

Multi-Agent orchestration platform backend. FastAPI + PostgreSQL + Redis + MinIO.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy environment config
cp .env.example .env

# 3. Start services (PostgreSQL + Redis + MinIO)
docker compose up -d

# 4. Run database migrations
alembic -c alembic/alembic.ini upgrade head

# 5. Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 6. Open API docs
open http://localhost:8000/docs
```

## Architecture

```
app/
├── main.py              # FastAPI entry
├── config.py            # Settings
├── database.py          # SQLAlchemy base + session
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── routers/             # API routes
├── services/            # Workflow engine + gateway
├── adapters/            # Agent adapters
├── core/                # A2A bus + MCP + exceptions
└── utils/               # Helpers
```

## API Endpoints

| Resource | Endpoints |
|----------|-----------|
| Agents | `GET/POST/PUT/DELETE /api/v1/agents`, `POST /api/v1/agents/{id}/test`, `POST /api/v1/agents/{id}/invoke` |
| Workflows | `GET/POST/PUT/DELETE /api/v1/workflows`, `POST /api/v1/workflows/{id}/run`, `POST /api/v1/workflows/{id}/validate` |
| Executions | `GET /api/v1/runs/{id}`, `POST /api/v1/runs/{id}/pause\|resume\|cancel`, `GET /api/v1/runs/{id}/logs` (SSE) |
| Artifacts | `GET /api/v1/artifacts`, `GET /api/v1/artifacts/{id}/content\|download`, `POST /api/v1/artifacts/{id}/review` |
| Settings | `GET/PUT /api/v1/settings`, `GET /api/v1/metrics/*`, `GET /api/v1/logs` |
| WebSocket | `WS /ws` |

## Deployment

```bash
# Production
docker compose -f docker-compose.yml up -d --build
```

## License

MIT
