# AgentNexus 启动指南

## 快速启动（3步）

### 1. 配置 API 密钥

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入你的真实 API 密钥：
# ANTHROPIC_API_KEY=sk-ant-xxxxx
# OPENAI_API_KEY=sk-xxxxx
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动服务

```bash
# 方法 A: 直接启动（仅 FastAPI，无数据库）
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 方法 B: Docker Compose（推荐，含 PostgreSQL + Redis + MinIO）
docker compose up -d
```

访问 http://localhost:8000/docs 查看 API 文档

---

## 配置说明

| 环境变量 | 用途 | 必需 |
|----------|------|------|
| `ANTHROPIC_API_KEY` | Claude Agent 调用 | ✅ 强烈推荐 |
| `OPENAI_API_KEY` | Codex Agent 调用 | ✅ 强烈推荐 |
| `DATABASE_URL` | PostgreSQL 连接 | ⚠️ 可选（无则内存存储） |
| `REDIS_URL` | Redis 缓存 | ⚠️ 可选 |

**没有 API 密钥时：**
- Claude Agent 会返回配置提示（不会报错崩溃）
- Codex Agent 会返回配置提示
- 其他 Agent（Trae/OpenClaw/Hermes/Cursor）连接用户自建的本地/远程服务

---

## 测试

```bash
# 运行测试套件
python tests/runner.py

# 测试特定 Agent
curl -X POST http://localhost:8000/api/v1/agents/agent-claude/test

# 直接调用 Agent
curl -X POST http://localhost:8000/api/v1/agents/agent-claude/invoke \
  -H "Content-Type: application/json" \
  -d '{"task_description": "Hello, are you working?"}'

# 运行工作流
curl -X POST http://localhost:8000/api/v1/workflows/wf-code-review/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"code": "def hello(): pass"}}'
```
