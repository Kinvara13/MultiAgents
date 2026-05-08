# AgentNexus 后端实施计划

## 一、技术选型结论

| 组件 | 选型 | 理由 |
|------|------|------|
| API 框架 | **FastAPI** (Python) | Python AI 生态友好、自动 Swagger 文档、Pydantic 类型验证、快速启动 |
| 工作流引擎 | **自研简化版** | Temporal 部署太重(Cassandra+ES)，本地部署需要轻量方案 |
| ORM | **SQLAlchemy 2.0** + **Alembic** | Python 生态标准、支持异步、迁移管理 |
| 数据库 | **PostgreSQL 16** | 关系型 + JSONB 灵活、ACID、本地部署友好 |
| 缓存/实时 | **Redis 7** | 会话、Pub/Sub、分布式锁 |
| 对象存储 | **MinIO** | S3 兼容、本地部署 |
| WebSocket | **FastAPI 原生** | 单框架搞定 |
| 部署 | **Docker Compose** | 一键本地启动 |

## 二、项目结构

```
agentnexus-backend/
├── docker-compose.yml           # 部署配置
├── Dockerfile                   # 后端镜像
├── requirements.txt             # Python 依赖
├── alembic/                     # 数据库迁移
│   ├── versions/               # 迁移脚本
│   ├── env.py
│   └── alembic.ini
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI 入口
│   ├── config.py                # 配置管理
│   ├── database.py              # 数据库连接
│   ├── models/                  # SQLAlchemy 模型
│   │   ├── __init__.py
│   │   ├── agent.py
│   │   ├── workflow.py
│   │   ├── execution.py
│   │   ├── checkpoint.py
│   │   ├── artifact.py
│   │   └── event.py
│   ├── schemas/                 # Pydantic 验证模型
│   │   ├── __init__.py
│   │   ├── agent.py
│   │   ├── workflow.py
│   │   ├── execution.py
│   │   └── artifact.py
│   ├── routers/                 # API 路由
│   │   ├── __init__.py
│   │   ├── agents.py
│   │   ├── workflows.py
│   │   ├── executions.py
│   │   ├── artifacts.py
│   │   ├── settings.py
│   │   └── ws.py               # WebSocket
│   ├── services/                # 业务逻辑
│   │   ├── __init__.py
│   │   ├── workflow_engine.py  # 工作流引擎核心
│   │   ├── agent_gateway.py    # Agent 网关
│   │   ├── checkpoint.py       # 检查点管理
│   │   └── event_store.py      # 事件存储
│   ├── adapters/                # Agent 适配器
│   │   ├── __init__.py
│   │   ├── base.py             # 适配器基类
│   │   ├── claude.py
│   │   ├── codex.py
│   │   ├── trae.py
│   │   ├── openclaw.py
│   │   ├── hermes.py
│   │   └── cursor.py
│   ├── core/                    # 核心工具
│   │   ├── __init__.py
│   │   ├── context.py          # 执行上下文
│   │   ├── message_bus.py      # A2A 消息总线
│   │   ├── mcp.py              # MCP 协议
│   │   └── exceptions.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
└── init-scripts/
    └── init.sql                 # 初始化数据
```

## 三、实施步骤

### Week 1: 项目骨架 + 数据库 + Agent API

**Day 1-2: 项目脚手架**
1. 创建 Python 虚拟环境
2. 安装依赖: FastAPI, SQLAlchemy, Alembic, uvicorn, redis, psycopg2-binary, aiohttp
3. 配置 Docker Compose (PostgreSQL + Redis + MinIO)
4. 创建项目结构

**Day 3-4: 数据库模型**
1. 定义 SQLAlchemy 模型 (Agent, Workflow, Execution, Checkpoint, Artifact, Event)
2. 生成 Alembic 迁移脚本
3. 初始化数据 (6个默认 Agent)

**Day 5: Agent API**
1. CRUD API: GET/POST/PUT/DELETE /api/v1/agents
2. 连接测试: POST /api/v1/agents/:id/test
3. 适配器基类设计
4. Claude 适配器 (HTTP + Streaming)

### Week 2: 工作流引擎 + 执行 API

**Day 1-2: 工作流引擎核心**
1. DAG 拓扑排序
2. 状态机驱动
3. 节点执行器 (Agent/Condition/Parallel/Merge)
4. 变量替换引擎

**Day 3-4: 执行控制**
1. 工作流启动: POST /api/v1/workflows/:id/run
2. 执行状态查询: GET /api/v1/runs/:id
3. 暂停/恢复/取消
4. 执行历史

**Day 5: WebSocket 实时推送**
1. 工作流执行事件流
2. Agent 状态变更推送
3. 日志实时推送

### Week 3: 产物管理 + 设置 + 集成

**Day 1-2: 产物 API**
1. 产物上传/下载
2. 版本历史
3. 代码审查

**Day 3: 设置 API**
1. 连接配置管理
2. 系统设置
3. 日志查询

**Day 4-5: 集成测试**
1. 前后端联调
2. 部署验证
3. 性能测试

## 四、关键接口设计

### Agent API
```
GET    /api/v1/agents         -> 列表 (支持 ?type=local&status=online)
POST   /api/v1/agents         -> 创建
GET    /api/v1/agents/{id}    -> 详情
PUT    /api/v1/agents/{id}    -> 更新
DELETE /api/v1/agents/{id}    -> 删除
POST   /api/v1/agents/{id}/test -> 连接测试
POST   /api/v1/agents/{id}/invoke -> 直接调用
```

### Workflow API
```
GET    /api/v1/workflows      -> 列表
POST   /api/v1/workflows      -> 创建
GET    /api/v1/workflows/{id} -> 详情
PUT    /api/v1/workflows/{id} -> 更新
DELETE /api/v1/workflows/{id} -> 删除
POST   /api/v1/workflows/{id}/run -> 运行
POST   /api/v1/workflows/{id}/validate -> 验证DAG
GET    /api/v1/workflows/{id}/runs -> 执行历史
```

### Execution API
```
GET    /api/v1/runs/{id}      -> 详情
POST   /api/v1/runs/{id}/pause   -> 暂停
POST   /api/v1/runs/{id}/resume  -> 恢复
POST   /api/v1/runs/{id}/cancel  -> 取消
GET    /api/v1/runs/{id}/logs    -> 日志 (SSE)
```

### Artifact API
```
GET    /api/v1/artifacts      -> 列表
GET    /api/v1/artifacts/{id} -> 详情
GET    /api/v1/artifacts/{id}/content -> 内容
GET    /api/v1/artifacts/{id}/download -> 下载
POST   /api/v1/artifacts/{id}/review -> 审查
```

### WebSocket
```
WS /ws
  -> auth: {type: "auth", token: "..."}
  -> subscribe: {type: "subscribe", channel: "workflow:{runId}"}
  <- events: {type: "node.started", payload: {...}}
```

## 五、工作流引擎状态机

```python
class WorkflowEngine:
    STATES = ['pending', 'running', 'paused', 'completed', 'failed']

    # 状态转换
    pending -> running   (用户点击「运行」)
    running -> paused    (用户点击「暂停」)
    paused  -> running   (用户点击「继续」)
    running -> completed (所有节点执行成功)
    running -> failed    (节点执行失败且无法恢复)
    running -> paused    (human 节点等待人工审核)

    def run(self, workflow_def: dict, inputs: dict, thread_id: str):
        # 1. 拓扑排序获取执行顺序
        execution_order = self.topological_sort(workflow_def)
        # 2. 初始化执行上下文
        context = ExecutionContext(thread_id, inputs)
        # 3. 逐节点执行
        for node_id in execution_order:
            result = self.execute_node(node_id, context)
            self.save_checkpoint(thread_id, node_id, result)
        # 4. 收集产物
        return context.artifacts
```

## 六、部署方式

```bash
# 1. 克隆代码
cd agentnexus-backend

# 2. 启动所有服务（PostgreSQL + Redis + MinIO + 后端）
docker compose up -d

# 3. 数据库自动迁移
# 4. 访问 http://localhost:8000/docs 查看 API 文档
```
