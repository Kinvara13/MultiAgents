# AgentNexus 深度架构设计

## 工作流控制 · Agent通讯 · 状态保持 · 后端数据库对接

---

## 目录

1. [工作流控制机制](#一工作流控制机制)
2. [Agent间通讯方式](#二agent间通讯方式)
3. [状态保持实现](#三状态保持实现)
4. [后端数据库对接](#四后端数据库对接)
5. [整体架构大图](#五整体架构大图)
6. [实现路线图](#六实现路线图)

---

## 一、工作流控制机制

### 1.1 核心执行模型：DAG + 状态机

AgentNexus 采用 **DAG（有向无环图）+ 状态机** 的双层执行模型，这是 LangGraph、n8n、Temporal 等业界主流引擎的共同选择。

```
┌─────────────────────────────────────────────────────────────┐
│                    工作流执行引擎 (Workflow Engine)            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   DAG 调度器  │───>│  状态机驱动器 │───>│  节点执行器   │  │
│  │  (Topology)  │    │   (State)    │    │  (Runner)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                     │                    │        │
│         ▼                     ▼                    ▼        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              执行上下文 (Execution Context)            │  │
│  │  { thread_id, state, variables, history, checkpoint } │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 1.1.1 DAG 拓扑层

DAG 定义了工作流的静态结构——节点（做什么）和边（执行顺序）。

```typescript
// 工作流定义（前端已有，后端需同步）
interface WorkflowDefinition {
  id: string
  name: string
  version: string
  nodes: WorkflowNode[]     // 节点定义
  edges: WorkflowEdge[]     // 边定义（连接关系）
}

interface WorkflowNode {
  id: string
  type: 'agent' | 'control' | 'data' | 'tool'
  config: NodeConfig         // 节点配置（如 Agent 选择、任务描述）
  position?: { x: number; y: number }  // 可视化位置
}

interface WorkflowEdge {
  id: string
  source: string            // 源节点 ID
  target: string            // 目标节点 ID
  sourceHandle?: string     // 输出端口（如 condition 的 true/false）
  condition?: string        // 条件表达式
}
```

**拓扑排序**：执行前引擎对 DAG 进行拓扑排序，生成执行序列。如果检测到环（Cycle），则在保存时拒绝并报错。

#### 1.1.2 状态机驱动层

状态机控制工作流的动态执行——当前在哪、下一步去哪。

```typescript
// 状态机定义
interface WorkflowState {
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  currentNodeId: string | null
  variables: Record<string, any>      // 全局变量存储
  nodeOutputs: Record<string, any>    // 各节点输出
  executionHistory: ExecutionStep[]   // 执行历史
  checkpoint: Checkpoint | null        // 检查点
}

interface ExecutionStep {
  nodeId: string
  startedAt: string
  completedAt?: string
  status: 'running' | 'completed' | 'failed' | 'skipped'
  input: any
  output?: any
  error?: ErrorInfo
}
```

**状态转换规则**：

```
         ┌──────────┐
         │  pending │
         └────┬─────┘
              │ 用户点击「运行」
              ▼
         ┌──────────┐
    ┌───>│ running  │<────┐
    │    └────┬─────┘     │
    │         │           │
    │    ┌────┴────┐      │ 重试/继续
    │    ▼         ▼      │
    │ ┌──────┐  ┌──────┐  │
    └─│paused│  │failed│──┘
      └──┬───┘  └──────┘
         │ 用户确认
         ▼
      ┌──────┐
      │completed
      └──────┘
```

### 1.2 节点类型与执行逻辑

#### 1.2.1 Agent 节点（智能体执行）

Agent 节点是最核心的节点类型，负责调用具体的 AI Agent 执行任务。

```typescript
interface AgentNodeConfig {
  agentId: string              // 目标 Agent ID
  taskDescription: string      // 任务描述（支持模板变量）
  inputVariables: Record<string, string>  // 输入变量映射
  timeout: number              // 超时时间（秒）
  retryCount: number           // 重试次数
  failureAction: 'stop' | 'skip' | 'retry' | 'fallback'  // 失败策略
  outputVariable: string       // 输出变量名
  modelConfig?: {              // 模型参数
    temperature: number
    maxTokens: number
    topP: number
  }
}
```

**Agent 节点执行流程**：

```
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐
│ 变量替换 │──>│ 能力匹配  │──>│ 请求发送 │──>│ 结果接收  │
│(Template)│   │(Routing) │   │(Request)│   │(Response)│
└─────────┘   └──────────┘   └─────────┘   └────┬─────┘
                                                  │
                         ┌────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │    失败处理策略      │
              ├─────────┬───────────┼──────────┐
              ▼         ▼           ▼          ▼
           ┌────┐   ┌──────┐   ┌────────┐  ┌────────┐
           │stop│   │ skip │   │ retry  │  │fallback│
           │终止│   │ 跳过 │   │ 重试N次 │  │ 备选Agent│
           └────┘   └──────┘   └────────┘  └────────┘
```

**变量替换机制**：使用 Handlebars 风格的模板语法

```typescript
// 任务描述模板
const taskDescription = "审查以下代码: {{inputs.code}}\nPR描述: {{inputs.pr_desc}}"

// 变量替换引擎
function resolveVariables(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getByPath(variables, path)
    return value !== undefined ? String(value) : match
  })
}

// 示例：从全局变量中提取嵌套值
// inputs.code -> variables["inputs"]["code"]
// pr_analysis.has_tests -> variables["pr_analysis"]["has_tests"]
```

#### 1.2.2 控制节点（流程控制）

| 节点类型 | 执行逻辑 | 典型用途 |
|----------|----------|----------|
| `start` | 工作流入口，初始化变量 | 参数接收 |
| `end` | 工作流出口，收集产物 | 结果返回 |
| `condition` | 条件表达式求值，走 true/false 分支 | IF/ELSE 判断 |
| `loop` | 循环计数器控制，支持 break | FOR/WHILE 循环 |
| `parallel` | 创建多个并行执行分支 | 分叉执行 |
| `merge` | 等待所有并行分支完成，合并结果 | 结果汇聚 |
| `wait` | 延时等待或等待外部事件 | 定时/事件等待 |
| `human` | 暂停执行，等待人工确认 | 人工审核 |

**Condition 节点求值引擎**：

```typescript
interface ConditionConfig {
  expression: string           // 表达式（如 "has_test_files"）
  variableRef: string          // 变量路径（如 "pr_analysis.has_tests"）
  operator: 'eq' | 'ne' | 'contains' | 'gt' | 'lt' | 'regex' | 'exists'
  compareValue?: any           // 比较值
  trueLabel: string            // 真分支标签
  falseLabel: string           // 假分支标签
}

// 条件求值
function evaluateCondition(config: ConditionConfig, variables: Record<string, any>): boolean {
  const value = getByPath(variables, config.variableRef)
  switch (config.operator) {
    case 'eq': return value === config.compareValue
    case 'ne': return value !== config.compareValue
    case 'contains': return String(value).includes(config.compareValue)
    case 'gt': return Number(value) > Number(config.compareValue)
    case 'lt': return Number(value) < Number(config.compareValue)
    case 'exists': return value !== undefined && value !== null
    default: return false
  }
}
```

#### 1.2.3 并行执行引擎

```
           ┌──────────┐
           │ parallel │
           │  节点    │
           └────┬─────┘
                │ 分叉
      ┌─────────┼─────────┐
      ▼         ▼         ▼
  ┌──────┐ ┌──────┐ ┌──────┐
  │AgentA│ │AgentB│ │AgentC│  ← 并行执行
  └──┬───┘ └──┬───┘ └──┬───┘
     │        │        │
     └────────┼────────┘
              ▼
           ┌──────┐
           │ merge │      ← 等待全部完成
           │ 节点  │
           └──┬───┘
              ▼
```

**实现方式**：Promise.all 等待所有分支完成

```typescript
async function executeParallel(node: ParallelNode, context: ExecutionContext) {
  const branches = getOutgoingBranches(node.id)
  
  // 同时启动所有分支
  const branchPromises = branches.map(branch => 
    executeBranch(branch, context.clone())
  )
  
  // 等待全部分支完成
  const results = await Promise.all(branchPromises)
  
  // 合并结果到全局变量
  context.variables[`${node.id}_results`] = results
  
  return results
}
```

### 1.3 执行调度器

#### 1.3.1 调度策略

```
┌─────────────────────────────────────────────────────┐
│                  调度队列 (Task Queue)                │
├─────────────────────────────────────────────────────┤
│  优先级  │  工作流实例  │  节点  │  状态  │  超时    │
├─────────┼─────────────┼───────┼───────┼─────────┤
│   P0    │   wf_001    │ node1 │ ready │  300s   │
│   P1    │   wf_002    │ node3 │ ready │  600s   │
│   P0    │   wf_001    │ node2 │ wait  │  -      │
└─────────┴─────────────┴───────┴───────┴─────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│              工作线程池 (Worker Pool)                  │
├─────────────────────────────────────────────────────┤
│  Worker-1  │  Worker-2  │  Worker-3  │  Worker-4      │
│  [running] │  [idle]    │  [running] │  [idle]        │
└─────────────────────────────────────────────────────┘
```

**调度算法**：
- **优先级调度**：P0（人工触发）> P1（定时触发）> P2（事件触发）
- **能力匹配**：根据 Agent 能力和当前负载选择最佳 Agent
- **超时控制**：每个节点有独立超时，超时后按失败策略处理

#### 1.3.2 事件驱动执行

```typescript
// 事件类型
type WorkflowEvent =
  | { type: 'NODE_STARTED'; nodeId: string; timestamp: Date }
  | { type: 'NODE_COMPLETED'; nodeId: string; output: any; duration: number }
  | { type: 'NODE_FAILED'; nodeId: string; error: Error; retryCount: number }
  | { type: 'NODE_RETRYING'; nodeId: string; attempt: number }
  | { type: 'WORKFLOW_PAUSED'; reason: string }
  | { type: 'WORKFLOW_RESUMED' }
  | { type: 'VARIABLE_CHANGED'; key: string; value: any }
  | { type: 'ARTIFACT_CREATED'; artifactId: string; type: string }

// 事件总线
class WorkflowEventBus {
  private listeners: Map<string, Set<(event: WorkflowEvent) => void>> = new Map()

  emit(event: WorkflowEvent) {
    // 写入事件日志（Event Sourcing）
    this.persistEvent(event)
    // 广播给监听器
    const handlers = this.listeners.get(event.type) || new Set()
    handlers.forEach(handler => handler(event))
  }

  on(type: string, handler: (event: WorkflowEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
  }
}
```

### 1.4 错误处理与补偿机制

#### 1.4.1 Saga 模式

对于跨多个 Agent 的长事务，采用 **Saga 编排模式**：

```
正常流程:    A ──> B ──> C ──> D
                     │
                     ▼
补偿流程:   A' <-- B'    C' <-- D'
           (撤销A) (撤销B)
```

```typescript
interface SagaStep {
  nodeId: string
  action: () => Promise<any>      // 正向操作
  compensate: () => Promise<any>  // 补偿操作（回滚）
}

class SagaOrchestrator {
  private completedSteps: SagaStep[] = []

  async execute(steps: SagaStep[]) {
    for (const step of steps) {
      try {
        await step.action()
        this.completedSteps.push(step)
      } catch (error) {
        // 执行补偿（倒序回滚）
        await this.compensate()
        throw error
      }
    }
  }

  private async compensate() {
    for (let i = this.completedSteps.length - 1; i >= 0; i--) {
      await this.completedSteps[i].compensate()
    }
  }
}
```

#### 1.4.2 重试策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| **固定间隔** | 每隔 N 秒重试 | 网络抖动 |
| **指数退避** | 间隔翻倍：1s, 2s, 4s, 8s... | API 限流 |
| **线性退避** | 间隔线性增加：1s, 2s, 3s, 4s... | 服务恢复中 |
| **抖动随机** | 在基础上添加随机偏移 | 避免惊群效应 |

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await sleep(delay)
    }
  }
  throw new Error('Unreachable')
}
```

---

## 二、Agent间通讯方式

### 2.1 分层协议架构

AgentNexus 采用 **A2A（Agent-to-Agent）+ MCP（Model Context Protocol）** 的分层协议策略，这是目前业界公认的最佳实践。

```
┌───────────────────────────────────────────────────────────┐
│                    AgentNexus 平台层                         │
│              （编排调度 · 状态管理 · 产物收集）                  │
├───────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌────────────────────────────┐ │
│  │     A2A 通讯层        │  │       MCP 工具层            │ │
│  │  （Agent间消息传递）    │  │  （Agent与工具/资源交互）     │ │
│  ├──────────────────────┤  ├────────────────────────────┤ │
│  │  · 消息路由           │  │  · 工具发现与调用           │ │
│  │  · 能力协商           │  │  · 资源读写                │ │
│  │  · 上下文传递         │  │  · Prompt 管理             │ │
│  │  · 订阅/发布          │  │  · 双向通讯                │ │
│  └──────────────────────┘  └────────────────────────────┘ │
├───────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Claude  │  │  Codex   │  │  Trae    │  │ OpenClaw │ │
│  │  (本地)   │  │  (本地)   │  │  (本地)   │  │ (远程)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│  ┌──────────┐  ┌──────────┐                              │
│  │  Hermes  │  │  Cursor  │                              │
│  │  (远程)   │  │  (本地)   │                              │
│  └──────────┘  └──────────┘                              │
└───────────────────────────────────────────────────────────┘
```

**设计原则**：
- **A2A 负责"谁跟谁说话"**：Agent 间的协作消息传递
- **MCP 负责"用什么工具"**：Agent 与外部工具/资源的标准化交互
- **平台层负责"什么时候说"**：编排调度、状态同步、产物管理

### 2.2 A2A（Agent-to-Agent）通讯协议

#### 2.2.1 消息格式

A2A 消息采用结构化 JSON，确保机器可读、可追踪、可调试。

```typescript
interface A2AMessage {
  // 消息元数据
  id: string                    // 消息唯一 ID（UUID）
  timestamp: string             // ISO 8601 时间戳
  version: string               // 协议版本（如 "1.0"）
  
  // 路由信息
  from: {
    agentId: string             // 发送 Agent ID
    nodeId: string              // 发送节点 ID（工作流上下文）
    workflowId: string          // 所属工作流 ID
  }
  to: {
    agentId: string             // 目标 Agent ID
    nodeId?: string             // 目标节点 ID（可选）
  }
  
  // 消息内容
  type: 'task' | 'query' | 'response' | 'handoff' | 'broadcast' | 'heartbeat'
  task: {
    id: string                  // 任务 ID
    name: string                // 任务名称
    description: string         // 任务描述
    priority: 'low' | 'medium' | 'high' | 'urgent'
    deadline?: string           // 截止时间
  }
  payload: {
    inputs: Record<string, any>   // 输入数据
    context: ExecutionContext      // 执行上下文
    artifacts: string[]           // 相关产物 ID
  }
  
  // 追踪信息
  trace: {
    traceId: string             // 分布式追踪 ID
    parentId?: string           // 父消息 ID
    depth: number               // 调用深度（防止无限递归）
    path: string[]              // 经过的 Agent 路径
  }
}
```

**消息类型说明**：

| 类型 | 说明 | 示例 |
|------|------|------|
| `task` | 任务派发 | "请审查这段代码" |
| `query` | 查询请求 | "请提供当前状态" |
| `response` | 响应回复 | "审查结果：通过" |
| `handoff` | 任务交接 | "将任务移交给 XXX" |
| `broadcast` | 广播消息 | "所有人暂停工作" |
| `heartbeat` | 心跳检测 | 定期状态上报 |

#### 2.2.2 消息路由机制

```
┌────────────────────────────────────────────────────────┐
│                 A2A 消息路由器                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  消息接收 │────>│  规则匹配引擎  │────>│  路由决策器  │ │
│  │         │     │              │     │             │ │
│  │ WebSocket│     │ · 目标Agent   │     │ · 直接路由   │ │
│  │ HTTP    │     │ · 能力标签    │     │ · 广播      │ │
│  │ Queue   │     │ · 优先级     │     │ · 负载均衡   │ │
│  └─────────┘     │ · 上下文     │     │ · 失败转移   │ │
│                  └──────────────┘     └──────┬──────┘ │
│                                              │        │
│                         ┌────────────────────┘        │
│                         ▼                             │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  消息发送 │<────│  传输适配器   │<────│  消息队列    │ │
│  │         │     │              │     │             │ │
│  │ WebSocket│     │ · WS 适配器   │     │ · 内存队列   │ │
│  │ HTTP    │     │ · HTTP 适配器 │     │ · Redis     │ │
│  │ SSE     │     │ · SSE 适配器  │     │ · RabbitMQ  │ │
│  └─────────┘     └──────────────┘     └─────────────┘ │
└────────────────────────────────────────────────────────┘
```

**路由策略**：

```typescript
interface RoutingRule {
  // 匹配条件
  match: {
    targetAgent?: string       // 指定目标 Agent
    capabilities?: string[]    // 所需能力标签
    priority?: number          // 最低优先级
  }
  
  // 路由动作
  action: {
    type: 'direct' | 'broadcast' | 'load_balance' | 'failover'
    agents?: string[]          // 候选 Agent 列表
    strategy?: 'round_robin' | 'least_busy' | 'capability_match'
  }
}

// 示例：负载均衡路由
const loadBalanceRule: RoutingRule = {
  match: { capabilities: ['code_review'] },
  action: {
    type: 'load_balance',
    agents: ['claude', 'codex'],
    strategy: 'least_busy'
  }
}
```

#### 2.2.3 传输层实现

AgentNexus 支持多种传输方式，适应不同部署场景：

| 传输方式 | 适用场景 | 优点 | 缺点 |
|----------|----------|------|------|
| **WebSocket** | 实时双向通讯 | 低延迟、全双工 | 需要维持连接 |
| **SSE** | 服务端推送 | 轻量、自动重连 | 仅服务端推送 |
| **HTTP** | 请求-响应 | 简单、穿透性好 | 有开销、无状态 |
| **Redis Pub/Sub** | 同网络内广播 | 高性能、解耦 | 需额外组件 |
| **消息队列** | 异步可靠传输 | 持久化、削峰 | 延迟较高 |

**本地 Agent 通讯**：

```typescript
// 本地 Agent 通过进程间通讯（IPC）
class LocalAgentTransport {
  private agents: Map<string, ChildProcess> = new Map()

  async send(agentId: string, message: A2AMessage): Promise<A2AMessage> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000)
      
      agent.once('message', (response: A2AMessage) => {
        clearTimeout(timeout)
        resolve(response)
      })
      
      agent.send(message)
    })
  }
}
```

**远程 Agent 通讯**：

```typescript
// 远程 Agent 通过 HTTP/WebSocket
class RemoteAgentTransport {
  private connections: Map<string, WebSocket> = new Map()

  async connect(agentId: string, endpoint: string) {
    const ws = new WebSocket(endpoint, {
      headers: { 'X-API-Key': this.getApiKey(agentId) }
    })
    this.connections.set(agentId, ws)
  }

  async send(agentId: string, message: A2AMessage): Promise<A2AMessage> {
    const ws = this.connections.get(agentId)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // 降级到 HTTP
      return this.sendViaHttp(agentId, message)
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000)
      
      const handler = (event: MessageEvent) => {
        clearTimeout(timeout)
        ws.removeEventListener('message', handler)
        resolve(JSON.parse(event.data))
      }
      
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify(message))
    })
  }
}
```

### 2.3 MCP（Model Context Protocol）工具层

#### 2.3.1 MCP 架构

MCP 是 Anthropic 提出的标准化协议，让 AI Agent 能够发现和使用外部工具。

```
┌──────────────┐                    ┌──────────────────┐
│   AI Agent    │  ── MCP 协议 ──>   │   MCP Server     │
│  (Client)    │                    │  (Tool Provider) │
└──────┬───────┘                    └────────┬─────────┘
       │                                     │
       │  1. 工具发现: list_tools()           │
       │<────────────────────────────────────│
       │     [{name:"search", params:{}}]     │
       │                                     │
       │  2. 工具调用: call_tool()            │
       │────────────────────────────────────>│
       │     {name:"search", args:{q:"AI"}}   │
       │                                     │
       │  3. 结果返回                        │
       │<────────────────────────────────────│
       │     {content:"...", error:null}      │
       │                                     │
```

#### 2.3.2 MCP Server 注册

每个 Agent 可以暴露自己的工具能力：

```typescript
interface MCPServer {
  name: string
  version: string
  tools: MCPTool[]
  resources: MCPResource[]
}

interface MCPTool {
  name: string
  description: string
  parameters: JSONSchema   // JSON Schema 参数定义
  handler: (args: any) => Promise<any>
}

// Claude Agent 暴露的工具
const claudeMCPServer: MCPServer = {
  name: 'claude-agent',
  version: '1.0',
  tools: [
    {
      name: 'generate_code',
      description: '生成代码',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['typescript', 'python', 'go'] },
          description: { type: 'string' },
          constraints: { type: 'array', items: { type: 'string' } }
        },
        required: ['language', 'description']
      },
      handler: async (args) => { /* ... */ }
    },
    {
      name: 'review_code',
      description: '审查代码',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          criteria: { type: 'array', items: { type: 'string' } }
        },
        required: ['code']
      },
      handler: async (args) => { /* ... */ }
    }
  ],
  resources: []
}
```

#### 2.3.3 Agent 适配器

```
┌─────────────────────────────────────────────────────────┐
│                   Agent 适配器层                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ ClaudeAdapter │  │ CodexAdapter │  │ TraeAdapter  │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ · MCP Client │  │ · LSP Bridge │  │ · LSP Bridge │  │
│  │ · HTTP API   │  │ · Stdio IPC  │  │ · Stdio IPC  │  │
│  │ · Streaming  │  │ · Streaming  │  │ · File Watch │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │OpenClawAdapter│  │HermesAdapter │  │CursorAdapter │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ · REST API   │  │ · WebSocket  │  │ · LSP Bridge │  │
│  │ · API Key    │  │ · Event Sub  │  │ · Stdio IPC  │  │
│  │ · Polling    │  │ · Message Q  │  │ · Streaming  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Claude 适配器示例**：

```typescript
class ClaudeAdapter implements AgentAdapter {
  private mcpClient: MCPClient
  private httpClient: AxiosInstance

  async initialize(config: AgentConfig) {
    // 初始化 MCP 客户端
    this.mcpClient = new MCPClient(config.mcpEndpoint)
    // 初始化 HTTP 客户端
    this.httpClient = axios.create({
      baseURL: config.endpoint,
      headers: { 'x-api-key': config.apiKey }
    })
  }

  async execute(task: TaskRequest): Promise<TaskResponse> {
    // 1. 通过 MCP 发现可用工具
    const tools = await this.mcpClient.listTools()
    
    // 2. 发送任务到 Claude
    const response = await this.httpClient.post('/v1/messages', {
      model: task.model || 'claude-3-5-sonnet',
      max_tokens: task.maxTokens || 4096,
      messages: [
        { role: 'user', content: task.description }
      ],
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      })),
      stream: true  // 流式响应
    })

    // 3. 处理流式响应
    return this.handleStreamResponse(response, task)
  }

  async getStatus(): Promise<AgentStatus> {
    const response = await this.httpClient.get('/v1/health')
    return {
      online: response.status === 200,
      load: response.data.load || 0,
      queueLength: response.data.queue_length || 0
    }
  }
}
```

### 2.4 通讯模式

#### 2.4.1 四种协作模式

```
模式一：顺序协作（Sequential）
┌────────┐    ┌────────┐    ┌────────┐
│ AgentA │───>│ AgentB │───>│ AgentC │
│  生成   │    │  审查   │    │  修改   │
└────────┘    └────────┘    └────────┘

模式二：并行协作（Parallel）
         ┌────────┐
         │ AgentA │──┐
         │  搜索   │  │
         └────────┘  │   ┌────────┐
                     ├──>│ AgentD │──> 汇总
         ┌────────┐  │   │  综合   │
         │ AgentB │──┘   └────────┘
         │  分析   │
         └────────┘

模式三：评审循环（Review Loop）
┌────────┐     ┌────────┐     未通过
│ AgentA │────>│ AgentB │────────┐
│  生成   │     │  审查   │        │
└────────┘     └────────┘        │
    ▲                            │
    └────────────────────────────┘
              修改后重提

模式四：竞争模式（Competitive）
┌────────┐   ┌────────┐   ┌────────┐
│ AgentA │   │ AgentB │   │ AgentC │
│ 解题v1 │   │ 解题v2 │   │ 解题v3 │
└────┬───┘   └────┬───┘   └────┬───┘
     └─────────────┼─────────────┘
                   ▼
            ┌────────────┐
            │   Judge    │──> 最优解
            │  (评估器)   │
            └────────────┘
```

---

## 三、状态保持实现

### 3.1 状态架构总览

AgentNexus 采用 **Event Sourcing + Checkpoint** 的双层状态保持架构，确保工作流的可靠性和可恢复性。

```
┌─────────────────────────────────────────────────────────────┐
│                     状态管理层 (State Management)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐        ┌──────────────────────────┐  │
│  │  实时状态 (Hot)   │        │  持久状态 (Cold)          │  │
│  │                  │        │                          │  │
│  │  · 内存 State     │        │  · Event Store           │  │
│  │  · 变量上下文     │───────>│  · Checkpoint DB         │  │
│  │  · 节点输出       │  保存   │  · Blob Storage          │  │
│  │  · 执行位置       │        │  · Snapshot              │  │
│  └──────────────────┘        └──────────────────────────┘  │
│           │                            │                    │
│           │  恢复                       │  回放              │
│           ▼                            ▼                    │
│  ┌──────────────────────────────────────────────┐          │
│  │           Event Sourcing 日志                 │          │
│  │                                              │          │
│  │  [t0] WORKFLOW_STARTED                       │          │
│  │  [t1] NODE_STARTED {node: "claude-1"}        │          │
│  │  [t2] NODE_COMPLETED {output: "..."}         │          │
│  │  [t3] VARIABLE_CHANGED {key: "result", ...}  │          │
│  │  [t4] NODE_STARTED {node: "codex-1"}         │          │
│  │  [t5] NODE_FAILED {error: "Timeout"}         │          │
│  │  [t6] NODE_RETRYING {attempt: 2}             │          │
│  │  [t7] NODE_COMPLETED {output: "..."}         │          │
│  │  ...                                         │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Checkpoint 机制

Checkpoint 是 LangGraph 的核心创新——在工作流的每个步骤后自动保存状态快照。

#### 3.2.1 Checkpoint 数据结构

```typescript
interface Checkpoint {
  // 标识
  checkpointId: string         // 检查点 ID
  threadId: string             // 会话/线程 ID（多用户隔离）
  workflowId: string            // 工作流定义 ID
  runId: string                // 本次运行 ID
  
  // 状态快照
  state: {
    status: WorkflowStatus
    currentNodeId: string | null
    variables: Record<string, any>      // 全局变量（序列化后存储）
    nodeOutputs: Record<string, any>    // 节点输出缓存
  }
  
  // 元数据
  metadata: {
    createdAt: string            // 创建时间
    nodeId: string               // 触发检查点的节点
    eventType: string            // 事件类型
    parentCheckpointId?: string  // 父检查点（用于分支）
  }
  
  // 下一步信息
  next: string[]                // 接下来要执行的节点 ID
  
  // 数据引用
  blobRef?: string              // 大状态数据的 Blob 引用
}
```

#### 3.2.2 Thread ID 机制

Thread ID 是多会话隔离的核心——不同会话的状态完全独立。

```typescript
// Thread ID 生成策略
function generateThreadId(userId: string, sessionId?: string): string {
  return `${userId}_${sessionId || crypto.randomUUID()}`
}

// 使用示例
const threadId = generateThreadId('user_123', 'session_456')

// 同 Thread = 共享上下文（连续对话）
const result1 = await workflow.run(input1, { threadId })
const result2 = await workflow.run(input2, { threadId })  // 记住 input1 的内容

// 不同 Thread = 完全隔离（新会话）
const result3 = await workflow.run(input3, { 
  threadId: generateThreadId('user_123', 'new_session') 
})  // 不知道之前的内容
```

#### 3.2.3 Checkpoint 存储后端

| 后端 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **MemorySaver** | 本地开发 | 零依赖、极速 | 重启丢失 |
| **SQLiteSaver** | 单机测试 | 文件存储、简单 | 并发性能差 |
| **PostgresSaver** | 生产环境 | 高并发、事务 | 需部署PG |
| **RedisSaver** | 高性能场景 | 亚毫秒级读写 | 内存成本 |
| **ScyllaSaver** | 大规模分布式 | 高吞吐、高可用 | 运维复杂 |

```typescript
// PostgreSQL 存储实现
class PostgresSaver implements CheckpointSaver {
  async save(checkpoint: Checkpoint) {
    const query = `
      INSERT INTO checkpoints 
        (checkpoint_id, thread_id, workflow_id, run_id, state, metadata, next, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (checkpoint_id) DO UPDATE SET
        state = EXCLUDED.state,
        metadata = EXCLUDED.metadata,
        next = EXCLUDED.next
    `
    await this.db.query(query, [
      checkpoint.checkpointId,
      checkpoint.threadId,
      checkpoint.workflowId,
      checkpoint.runId,
      JSON.stringify(checkpoint.state),
      JSON.stringify(checkpoint.metadata),
      JSON.stringify(checkpoint.next)
    ])
  }

  async load(threadId: string, workflowId: string): Promise<Checkpoint | null> {
    const result = await this.db.query(
      `SELECT * FROM checkpoints 
       WHERE thread_id = $1 AND workflow_id = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [threadId, workflowId]
    )
    return result.rows[0] || null
  }

  async list(threadId: string): Promise<Checkpoint[]> {
    const result = await this.db.query(
      `SELECT * FROM checkpoints WHERE thread_id = $1 ORDER BY created_at`,
      [threadId]
    )
    return result.rows
  }
}
```

### 3.3 Event Sourcing 实现

所有状态变更以不可变事件的形式存储，当前状态通过重放事件得到。

#### 3.3.1 事件存储

```typescript
interface DomainEvent {
  eventId: string              // 事件 UUID
  eventType: string            // 事件类型
  aggregateId: string          // 聚合根 ID（工作流实例 ID）
  aggregateType: string        // 聚合类型（workflow）
  version: number              // 版本号（乐观锁）
  payload: Record<string, any> // 事件数据
  metadata: {
    timestamp: string
    userId?: string
    nodeId?: string
    traceId?: string
  }
}

// 事件存储接口
interface EventStore {
  append(events: DomainEvent[]): Promise<void>
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>
  getAllEvents(since?: string): Promise<DomainEvent[]>
}
```

#### 3.3.2 状态重建

```typescript
class WorkflowStateReconstructor {
  constructor(private eventStore: EventStore) {}

  async reconstruct(workflowInstanceId: string): Promise<WorkflowState> {
    // 1. 获取该工作流的所有事件
    const events = await this.eventStore.getEvents(workflowInstanceId)
    
    // 2. 初始状态
    let state: WorkflowState = {
      status: 'pending',
      currentNodeId: null,
      variables: {},
      nodeOutputs: {},
      executionHistory: []
    }
    
    // 3. 逐个应用事件
    for (const event of events) {
      state = this.applyEvent(state, event)
    }
    
    return state
  }

  private applyEvent(state: WorkflowState, event: DomainEvent): WorkflowState {
    switch (event.eventType) {
      case 'WORKFLOW_STARTED':
        return { ...state, status: 'running', currentNodeId: event.payload.firstNodeId }
      
      case 'NODE_STARTED':
        return {
          ...state,
          currentNodeId: event.payload.nodeId,
          executionHistory: [...state.executionHistory, {
            nodeId: event.payload.nodeId,
            startedAt: event.metadata.timestamp,
            status: 'running',
            input: event.payload.input
          }]
        }
      
      case 'NODE_COMPLETED':
        return {
          ...state,
          nodeOutputs: {
            ...state.nodeOutputs,
            [event.payload.nodeId]: event.payload.output
          },
          executionHistory: state.executionHistory.map(h =>
            h.nodeId === event.payload.nodeId
              ? { ...h, status: 'completed', completedAt: event.metadata.timestamp, output: event.payload.output }
              : h
          )
        }
      
      case 'VARIABLE_CHANGED':
        return {
          ...state,
          variables: {
            ...state.variables,
            [event.payload.key]: event.payload.value
          }
        }
      
      case 'WORKFLOW_COMPLETED':
        return { ...state, status: 'completed', currentNodeId: null }
      
      case 'WORKFLOW_FAILED':
        return { ...state, status: 'failed', currentNodeId: null }
      
      default:
        return state
    }
  }
}
```

### 3.4 上下文管理

#### 3.4.1 上下文传递模型

```
┌─────────────────────────────────────────────────────────────┐
│                    执行上下文 (Execution Context)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  全局变量     │  │  节点输出     │  │    上下文堆栈        │ │
│  │  (Global)    │  │  (Outputs)   │  │   (Context Stack)   │ │
│  ├─────────────┤  ├─────────────┤  ├─────────────────────┤ │
│  │ topic = "AI"│  │ node1.out   │  │ · workflow config   │ │
│  │ count = 5   │  │ node2.out   │  │ · parent context    │ │
│  │ user = {...}│  │ node3.out   │  │ · metadata          │ │
│  │             │  │             │  │ · trace info        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                 记忆存储 (Memory)                       │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  Short-term: 当前工作流变量                               │ │
│  │  Long-term:  跨工作流共享知识（向量数据库）                  │ │
│  │  Episodic:  历史执行经验（案例库）                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.4.2 变量作用域

```typescript
interface VariableScope {
  // 全局变量 - 所有节点可读写
  global: Record<string, any>
  
  // 节点局部变量 - 仅当前节点可读写
  local: Record<string, any>
  
  // 输入变量 - 由上游节点传入（只读）
  inputs: Record<string, any>
  
  // 输出变量 - 当前节点产出
  outputs: Record<string, any>
  
  // 环境变量 - 系统级配置（只读）
  env: Record<string, string>
}

// 变量解析优先级（从内到外）
// 1. local > 2. inputs > 3. global > 4. env
function resolveVariable(name: string, scope: VariableScope): any {
  return scope.local[name] 
    ?? scope.inputs[name]
    ?? scope.global[name]
    ?? scope.env[name]
    ?? undefined
}
```

### 3.5 状态持久化流程

```
用户点击「运行」
     │
     ▼
┌─────────────────┐
│ 1. 创建 Thread   │
│    生成 threadId │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ 2. 初始化 Checkpoint     │
│    state = {status: pending}
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────┐     失败
│ 3. 执行节点 A               │────────> 保存错误状态 ──> 触发补偿
│    · 写入事件 NODE_STARTED   │
│    · 调用 Agent              │
│    · 写入事件 NODE_COMPLETED │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 4. 保存 Checkpoint          │
│    · 序列化 state            │
│    · 写入 PostgreSQL/Redis   │
│    · 异步写入 Event Store    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 5. 执行节点 B               │
│    · 从 Checkpoint 恢复 state│
│    · 重复步骤 3-4            │
└────────┬────────────────────┘
         │
         ▼
      ...
         │
         ▼
┌─────────────────┐
│ 6. 工作流完成    │
│    最终 Checkpoint
│    收集产物      │
└─────────────────┘
```

---

## 四、后端数据库对接

### 4.1 数据库架构

AgentNexus 采用 **多数据库策略（Polyglot Persistence）**，不同类型的数据使用最合适的存储引擎。

```
┌──────────────────────────────────────────────────────────────┐
│                    数据持久化层                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌──────────────────────┐        │
│  │  PostgreSQL      │      │  Redis               │        │
│  │  （关系型数据）   │      │  （缓存/实时）        │        │
│  ├──────────────────┤      ├──────────────────────┤        │
│  │ · Agent 配置     │      │ · 会话状态 (Hot)      │        │
│  │ · 工作流定义     │      │ · 实时计数器          │        │
│  │ · 用户/权限      │      │ · 分布式锁           │        │
│  │ · 执行历史       │      │ · Pub/Sub            │        │
│  │ · Checkpoint    │      │ · 限流器             │        │
│  └──────────────────┘      └──────────────────────┘        │
│                                                              │
│  ┌──────────────────┐      ┌──────────────────────┐        │
│  │  TimescaleDB     │      │  MinIO / S3          │        │
│  │  （时序数据）     │      │  （对象存储）         │        │
│  ├──────────────────┤      ├──────────────────────┤        │
│  │ · 性能指标       │      │ · 产物文件           │        │
│  │ · 资源使用       │      │ · 大状态 Blob        │        │
│  │ · Agent 心跳     │      │ · 日志归档           │        │
│  │ · 响应时间       │      │ · 导出文件           │        │
│  └──────────────────┘      └──────────────────────┘        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Elasticsearch / OpenSearch                           │   │
│  │  （全文搜索）                                          │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ · 日志全文搜索                                        │   │
│  │ · 产物内容搜索                                        │   │
│  │ · 执行历史检索                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 PostgreSQL 数据模型

#### 4.2.1 Agent 表

```sql
-- Agent 配置表
CREATE TABLE agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) UNIQUE NOT NULL,     -- 标识符：claude/codex/trae
    type            VARCHAR(20) NOT NULL CHECK (type IN ('local', 'remote')),
    status          VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'error')),
    
    -- 连接配置
    endpoint        VARCHAR(500),                     -- API 端点地址
    api_key         TEXT,                             -- 加密存储的 API Key
    config          JSONB DEFAULT '{}',               -- 扩展配置
    
    -- 能力标签
    capabilities    TEXT[] DEFAULT '{}',              -- ['code_review', 'writing', ...]
    
    -- 元数据
    description     TEXT,
    icon            VARCHAR(50),
    color           VARCHAR(7),                       -- 十六进制颜色
    
    -- 统计（冗余，提升查询性能）
    total_tasks     INTEGER DEFAULT 0,
    success_rate    DECIMAL(5,2) DEFAULT 100.00,      -- 百分比
    avg_duration_ms INTEGER DEFAULT 0,
    
    -- 时间戳
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_capabilities ON agents USING GIN(capabilities);
```

#### 4.2.2 工作流表

```sql
-- 工作流定义表
CREATE TABLE workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    version         VARCHAR(20) DEFAULT '1.0.0',
    
    -- DAG 定义（JSON 格式，与前端兼容）
    definition      JSONB NOT NULL,                   -- { nodes: [...], edges: [...] }
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_template     BOOLEAN DEFAULT FALSE,
    
    -- 触发配置
    trigger_type    VARCHAR(50),                      -- 'manual' | 'schedule' | 'webhook' | 'event'
    trigger_config  JSONB DEFAULT '{}',               -- 触发器配置
    
    -- 权限
    owner_id        UUID NOT NULL,
    team_id         UUID,
    
    -- 统计
    run_count       INTEGER DEFAULT 0,
    success_count   INTEGER DEFAULT 0,
    fail_count      INTEGER DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 工作流执行实例表
CREATE TABLE workflow_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id),
    thread_id       UUID NOT NULL,                    -- 会话隔离
    
    -- 执行状态
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    
    -- 输入输出
    inputs          JSONB DEFAULT '{}',               -- 初始输入
    outputs         JSONB DEFAULT '{}',               -- 最终输出
    
    -- 执行信息
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,
    
    -- 错误信息
    error           JSONB,                            -- { message, stack, nodeId }
    
    -- 关联
    triggered_by    UUID,                             -- 触发用户 ID
    trigger_type    VARCHAR(50),                      -- 'manual' | 'schedule' | 'webhook'
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_thread ON workflow_runs(thread_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_created ON workflow_runs(created_at DESC);
```

#### 4.2.3 节点执行表

```sql
-- 节点执行记录表
CREATE TABLE node_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES workflow_runs(id),
    node_id         VARCHAR(50) NOT NULL,             -- 工作流内节点 ID
    
    -- Agent 信息
    agent_id        UUID REFERENCES agents(id),
    agent_name      VARCHAR(100),                     -- 冗余，方便查询
    
    -- 执行状态
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'retrying')),
    
    -- 输入输出（大字段可存 Blob Store 引用）
    inputs          JSONB,
    outputs         JSONB,
    
    -- 性能指标
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,
    tokens_input    INTEGER DEFAULT 0,                -- LLM Token 消耗
    tokens_output   INTEGER DEFAULT 0,
    
    -- 错误
    error           JSONB,
    retry_count     INTEGER DEFAULT 0,
    
    -- 产物关联
    artifact_ids    UUID[] DEFAULT '{}',
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_node_exec_run ON node_executions(run_id);
CREATE INDEX idx_node_exec_agent ON node_executions(agent_id);
CREATE INDEX idx_node_exec_status ON node_executions(status);
```

#### 4.2.4 Checkpoint 表

```sql
-- Checkpoint 表（用于状态恢复）
CREATE TABLE checkpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL,
    workflow_id     UUID NOT NULL,
    run_id          UUID NOT NULL REFERENCES workflow_runs(id),
    
    -- 状态快照
    state           JSONB NOT NULL,                   -- 完整状态
    
    -- 下一步
    next_nodes      TEXT[] DEFAULT '{}',              -- 接下来要执行的节点
    
    -- 大状态 Blob 引用
    blob_ref        VARCHAR(500),                     -- MinIO/S3 对象键
    
    -- 元数据
    node_id         VARCHAR(50),                      -- 触发检查点的节点
    event_type      VARCHAR(50),                      -- 事件类型
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkpoints_thread ON checkpoints(thread_id, workflow_id, created_at DESC);
CREATE INDEX idx_checkpoints_run ON checkpoints(run_id);
```

#### 4.2.5 Event Store 表

```sql
-- 事件存储表（Event Sourcing）
CREATE TABLE events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(100) NOT NULL,
    
    -- 聚合信息
    aggregate_id    UUID NOT NULL,                    -- 聚合根 ID（如 workflow_run_id）
    aggregate_type  VARCHAR(50) NOT NULL,             -- 'workflow_run' | 'agent' | 'artifact'
    version         INTEGER NOT NULL,                 -- 乐观锁版本号
    
    -- 事件数据
    payload         JSONB NOT NULL,
    
    -- 元数据
    metadata        JSONB DEFAULT '{}',               -- { timestamp, userId, nodeId, traceId }
    
    -- 时间戳（使用数据库时间）
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- 唯一约束：同一聚合的版本号不重复
    UNIQUE(aggregate_id, version)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, version);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);
```

#### 4.2.6 产物表

```sql
-- 产物表
CREATE TABLE artifacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(500) NOT NULL,
    path            TEXT NOT NULL,                    -- 文件路径
    
    -- 文件信息
    mime_type       VARCHAR(100),                     -- 'text/x-typescript' | 'image/png'
    size_bytes      BIGINT,
    checksum        VARCHAR(64),                      -- SHA-256
    
    -- 存储
    storage_type    VARCHAR(20) DEFAULT 'local' CHECK (storage_type IN ('local', 's3', 'minio')),
    storage_ref     VARCHAR(500),                     -- 存储路径/对象键
    
    -- 关联
    run_id          UUID REFERENCES workflow_runs(id),
    node_id         UUID REFERENCES node_executions(id),
    agent_id        UUID REFERENCES agents(id),
    
    -- 版本
    version         INTEGER DEFAULT 1,
    parent_id       UUID REFERENCES artifacts(id),    -- 上一版本
    
    -- 元数据
    metadata        JSONB DEFAULT '{}',               -- { language, lineCount, encoding }
    tags            TEXT[] DEFAULT '{}',
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artifacts_run ON artifacts(run_id);
CREATE INDEX idx_artifacts_agent ON artifacts(agent_id);
CREATE INDEX idx_artifacts_type ON artifacts(mime_type);
CREATE INDEX idx_artifacts_created ON artifacts(created_at DESC);
```

### 4.3 Redis 数据结构

Redis 用于缓存、实时状态、Pub/Sub 等高频低延迟场景。

```
┌─────────────────────────────────────────────────────┐
│                    Redis 数据                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  STRING  session:{threadId}  ->  JSON(state)        │
│  (会话状态，TTL=24h)                                  │
│                                                     │
│  HASH    agent:{agentId}  ->  { status, load, ... } │
│  (Agent 实时状态)                                     │
│                                                     │
│  STREAM  events:workflow  ->  { event }             │
│  (实时事件流)                                        │
│                                                     │
│  PUB/SUB channel:workflow:{runId}                   │
│  (工作流实时推送)                                     │
│                                                     │
│  ZSET    metrics:response_time                      │
│  (时序指标排序集)                                     │
│                                                     │
│  SET     online_agents  ->  [agentId1, agentId2]    │
│  (在线Agent集合)                                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.4 API 接口设计

#### 4.4.1 REST API

```typescript
// ===== Agent API =====
GET    /api/v1/agents                    // 获取Agent列表（支持过滤/分页）
POST   /api/v1/agents                    // 注册Agent
GET    /api/v1/agents/:id                // 获取Agent详情
PUT    /api/v1/agents/:id                // 更新Agent配置
DELETE /api/v1/agents/:id                // 删除Agent
POST   /api/v1/agents/:id/test           // 测试连接
GET    /api/v1/agents/:id/logs           // 获取Agent日志（SSE流）
POST   /api/v1/agents/:id/invoke         // 直接调用Agent

// ===== Workflow API =====
GET    /api/v1/workflows                 // 获取工作流列表
POST   /api/v1/workflows                 // 创建工作流
GET    /api/v1/workflows/:id             // 获取工作流详情
PUT    /api/v1/workflows/:id             // 更新工作流
DELETE /api/v1/workflows/:id             // 删除工作流
POST   /api/v1/workflows/:id/run         // 运行工作流
POST   /api/v1/workflows/:id/validate    // 验证DAG
GET    /api/v1/workflows/:id/runs        // 获取执行历史

// ===== Workflow Run API =====
GET    /api/v1/runs/:id                  // 获取运行实例详情
POST   /api/v1/runs/:id/pause            // 暂停
POST   /api/v1/runs/:id/resume           // 恢复
POST   /api/v1/runs/:id/cancel           // 取消
GET    /api/v1/runs/:id/logs             // 获取执行日志（SSE流）
GET    /api/v1/runs/:id/checkpoints      // 获取检查点列表

// ===== Artifact API =====
GET    /api/v1/artifacts                 // 获取产物列表
GET    /api/v1/artifacts/:id             // 获取产物详情
GET    /api/v1/artifacts/:id/content     // 获取产物内容
GET    /api/v1/artifacts/:id/download    // 下载产物
POST   /api/v1/artifacts/:id/review      // 提交审查意见
GET    /api/v1/artifacts/:id/versions    // 获取版本历史

// ===== Metrics API =====
GET    /api/v1/metrics/agents            // Agent性能指标
GET    /api/v1/metrics/system            // 系统资源指标
GET    /api/v1/metrics/workflows         // 工作流统计

// ===== Settings API =====
GET    /api/v1/settings                  // 获取设置
PUT    /api/v1/settings                  // 更新设置
GET    /api/v1/logs                      // 系统日志（支持过滤/搜索）
```

#### 4.4.2 WebSocket API

```typescript
// 连接
const ws = new WebSocket('wss://api.agentnexus.local/ws')

// 认证（连接后第一条消息）
ws.send(JSON.stringify({
  type: 'auth',
  token: 'Bearer eyJhbGciOiJIUzI1NiIs...'
}))

// 订阅工作流实时更新
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'workflow:run_123'
}))

// 服务端推送的事件
interface WSEvent {
  type: 'node.started' | 'node.completed' | 'node.failed' 
       | 'variable.changed' | 'artifact.created' 
       | 'agent.status_changed' | 'workflow.completed'
  timestamp: string
  payload: {
    runId: string
    nodeId?: string
    agentId?: string
    data: any
  }
}
```

### 4.5 后端技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| API 框架 | FastAPI (Python) / NestJS (Node) | REST API 服务 |
| 数据库 | PostgreSQL 16 | 主数据库 |
| 缓存 | Redis 7 | 会话/实时状态/PubSub |
| 时序 | TimescaleDB | 性能指标/日志 |
| 对象存储 | MinIO | 产物文件/大状态Blob |
| 搜索 | OpenSearch | 日志/产物全文搜索 |
| 消息队列 | Redis Streams / RabbitMQ | 异步任务/事件 |
| 工作流引擎 | Temporal / 自研 | DAG执行/状态机 |
| 向量数据库 | pgvector / Qdrant | Agent记忆/RAG |
| WebSocket | Socket.io / ws | 实时推送 |
| 监控 | Prometheus + Grafana | 指标收集/可视化 |

---

## 五、整体架构大图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client Layer)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   首页   │  │  仪表盘   │  │ Agent管理 │  │ 工作流编排│  │ 设置监控  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ REST API / WebSocket / SSE
┌──────────────────────────────────────────────────────────────────────────────┐
│                              API 网关层 (Gateway Layer)                       │
│  ┌────────────────────────────────────────────────────────────────────┐      │
│  │  · 认证鉴权 (JWT/OAuth)  · 限流熔断  · 日志追踪  · 负载均衡          │      │
│  └────────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
┌────────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│    工作流引擎服务        │ │   Agent 网关服务  │ │     监控/日志服务         │
│  (Workflow Engine)      │ │  (Agent Gateway)  │ │   (Observability)       │
├────────────────────────┤ ├──────────────────┤ ├──────────────────────────┤
│ · DAG 解析与调度        │ │ · 协议适配        │ │ · 指标收集               │
│ · 状态机驱动            │ │ · A2A 消息路由    │ │ · 日志聚合               │
│ · Checkpoint 管理       │ │ · MCP 工具注册    │ │ · 告警通知               │
│ · 事件溯源              │ │ · 健康检查        │ │ · 链路追踪               │
│ · Saga 编排             │ │ · 负载均衡        │ │ · 性能分析               │
└──────────┬─────────────┘ └────────┬─────────┘ └──────────┬───────────────┘
           │                        │                      │
           ▼                        ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          数据持久化层 (Persistence Layer)                      │
│                                                                              │
│   ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│   │ PostgreSQL │  │   Redis    │  │  TimescaleDB │  │   MinIO / S3    │   │
│   │            │  │            │  │              │  │                  │   │
│   │ · workflows│  │ · session  │  │ · metrics    │  │ · artifacts     │   │
│   │ · agents   │  │ · agent_rt │  │ · logs       │  │ · checkpoints   │   │
│   │ · runs     │  │ · pub/sub  │  │ · events     │  │ · exports       │   │
│   │ · events   │  │ · queue    │  │              │  │                  │   │
│   └────────────┘  └────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
┌────────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│      Claude 适配器       │ │   OpenClaw 适配器 │ │      Hermes 适配器        │
│  (HTTP + MCP Client)    │ │  (REST API)      │ │  (WebSocket)            │
└────────────────────────┘ └──────────────────┘ └──────────────────────────┘
         │                          │                          │
         ▼                          ▼                          ▼
   ┌──────────┐               ┌──────────┐               ┌──────────┐
   │  Claude   │               │ OpenClaw │               │  Hermes  │
   │ (本地:8080)│               │(远程API) │               │(远程WS)  │
   └──────────┘               └──────────┘               └──────────┘

┌────────────────────────┐ ┌──────────────────┐
│      Trae 适配器        │ │   Codex 适配器    │
│   (LSP + Stdio IPC)     │ │  (LSP + Stdio)   │
└────────────────────────┘ └──────────────────┘
         │                          │
         ▼                          ▼
   ┌──────────┐               ┌──────────┐
   │   Trae   │               │   Codex  │
   │ (本地进程) │               │ (本地进程) │
   └──────────┘               └──────────┘
```

---

## 六、实现路线图

### Phase 1: 最小可用后端（MVP）—— 4周

| 周 | 任务 | 产出 |
|----|------|------|
| 第1周 | PostgreSQL 数据库搭建 + 核心表设计 | 数据库Schema、迁移脚本 |
| 第1周 | FastAPI 项目骨架 + 基础中间件 | API服务框架、认证模块 |
| 第2周 | Agent CRUD API + 连接测试 | Agent管理后端完整接口 |
| 第2周 | Workflow CRUD API + DAG验证 | 工作流管理后端完整接口 |
| 第3周 | 工作流执行引擎（简化版） | 顺序执行、条件分支、并行 |
| 第3周 | Claude/OpenClaw 适配器 | Agent调用能力 |
| 第4周 | WebSocket 实时推送 | 前端实时状态更新 |
| 第4周 | 产物存储 API | 文件上传/下载/版本 |

### Phase 2: 生产级执行引擎 —— 3周

| 周 | 任务 | 产出 |
|----|------|------|
| 第1周 | Checkpoint 机制 + Event Sourcing | 断点续传、容错恢复 |
| 第1周 | Redis 集成（会话/缓存/PubSub） | 高性能状态管理 |
| 第2周 | Saga 补偿事务 + 重试策略 | 复杂流程可靠性 |
| 第2周 | 任务队列 + Worker Pool | 高并发执行 |
| 第3周 | TimescaleDB 指标存储 | 性能监控 |
| 第3周 | 日志系统 + OpenSearch | 全文检索 |

### Phase 3: 高级功能 —— 3周

| 周 | 任务 | 产出 |
|----|------|------|
| 第1周 | A2A 消息协议实现 | Agent间直接通讯 |
| 第1周 | MCP Server 注册/发现 | 工具标准化 |
| 第2周 | 自然语言生成工作流 | AI辅助编排 |
| 第2周 | 智能任务路由 | 负载均衡/能力匹配 |
| 第3周 | 评审循环/竞争模式 | 高级协作模式 |
| 第3周 | 向量数据库集成 | Agent长期记忆 |

### Phase 4: 企业级 —— 持续

- 多用户/团队/权限体系
- CI/CD 集成（GitHub Actions/GitLab）
- IDE 插件（VS Code/JetBrains）
- 审计合规（SOC2/GDPR）
- 水平扩展（K8s 部署）

---

## 附录：参考文献

1. **LangGraph** - [https://langchain-ai.github.io/langgraph/](https://langchain-ai.github.io/langgraph/) - 图状态机与Checkpoint机制
2. **Temporal** - [https://temporal.io/](https://temporal.io/) - 持久化工作流引擎
3. **n8n** - [https://n8n.io/](https://n8n.io/) - 可视化工作流执行模型
4. **MCP (Model Context Protocol)** - [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/) - 工具标准化协议
5. **A2A (Agent-to-Agent)** - [https://google.github.io/A2A/](https://google.github.io/A2A/) - Agent间通讯协议
6. **Event Sourcing** - [https://martinfowler.com/eaaDev/EventSourcing.html](https://martinfowler.com/eaaDev/EventSourcing.html) - 事件溯源模式
7. **Saga Pattern** - [https://microservices.io/patterns/data/saga.html](https://microservices.io/patterns/data/saga.html) - 分布式事务

---

*AgentNexus Architecture Design v2.0*
*2026年5月*
