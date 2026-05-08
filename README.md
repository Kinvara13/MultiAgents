# AgentNexus - Multi-Agent Orchestration Platform

A locally-deployable platform for managing and orchestrating multiple AI agents (remote: OpenClaw, Hermes; local: Claude, Codex, Trae, Cursor) with visual workflow builder, real-time collaboration, and artifact management.

## Project Structure

```
.
├── frontend/          # React 19 + TypeScript + Tailwind CSS
├── backend/           # FastAPI + PostgreSQL + Redis + MinIO
└── docs/              # Architecture & operation guides
```

## Quick Start

### Prerequisites
- Node.js 20+, Python 3.12+, Docker & Docker Compose

### 1. Start Backend

```bash
cd backend
cp .env.example .env
docker compose up -d          # PostgreSQL + Redis + MinIO + FastAPI
# API docs: http://localhost:8000/docs
```

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
# Auto-proxies /api to localhost:8000
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, React Flow |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic |
| Database | PostgreSQL 16, Redis 7, MinIO (S3-compatible) |
| Protocol | A2A (Agent-to-Agent), MCP (Model Context Protocol) |

## Features

- **Dashboard** - Real-time agent status, task queue, system metrics
- **Agent Management** - 6 pre-configured agents, CRUD, health check, direct invoke
- **Workflow Builder** - Visual node editor with React Flow, 3 templates
- **Artifact Center** - File tree, syntax highlighting, code review, version history
- **Settings & Monitoring** - Connection config, performance charts, logs

## Documentation

- [Architecture Design](AgentNexus_%E6%B7%B1%E5%BA%A6%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md) - Workflow control, agent communication, state management
- [Implementation Plan](AgentNexus_%E5%90%8E%E7%AB%AF%E5%AE%9E%E6%96%BD%E8%AE%A1%E5%88%92.md) - Backend development steps
- [Operation Guide](AgentNexus_%E6%9E%B6%E6%9E%84%E4%B8%8E%E6%93%8D%E4%BD%9C%E6%8C%87%E5%8D%97.md) - Usage instructions & FAQ

## License

MIT
