# AgentNexus 多Agent协同管理平台

## 系统架构说明与操作指南

---

## 一、系统架构

### 1.1 整体架构

```
+----------------------------------------------------------+
|                     用户层 (Frontend)                      |
|  +--------+  +---------+  +---------+  +---------+       |
|  |  首页  |  | 仪表盘  |  | 智能体  |  |  工作流  |       |
|  | (Home) |  | (Dash)  |  | (Agent) |  |(Workflow)|      |
|  +--------+  +---------+  +---------+  +---------+       |
|  +---------+  +---------+                                |
|  |  产物  |  |  设置   |                                 |
|  |(Artifact)| |(Settings)|                                |
|  +---------+  +---------+                                |
+----------------------+-----------------------------------+
                       | React Router (HashRouter)
+----------------------+-----------------------------------+
|                     应用层 (App Layer)                     |
|  Layout.tsx  Navbar.tsx  Footer.tsx  Theme/Style           |
+----------------------+-----------------------------------+
                       | Zustand / React Context
+----------------------+-----------------------------------+
|                     业务层 (Business Layer)                |
|  Agent管理  工作流引擎  产物管理  监控/日志  用户配置       |
+----------------------+-----------------------------------+
                       | REST API / WebSocket / Local
+----------------------+-----------------------------------+
|                     适配层 (Adapter Layer)                 |
|  +----------+  +---------+  +---------+  +--------+      |
|  | OpenClaw |  | Hermes  |  | Claude  |  | Codex  |      |
|  | Adapter  |  | Adapter |  | Adapter |  | Adapter|      |
|  +----------+  +---------+  +---------+  +--------+      |
|  +----------+  +---------+                                |
|  |   Trae   |  | Cursor  |                                |
|  | Adapter  |  | Adapter |                                |
|  +----------+  +---------+                                |
+----------------------+-----------------------------------+
```

### 1.2 前端技术架构

```
agentnexus-frontend/
├── public/                          # 静态资源
│   ├── hero-orb.mp4                 # 首页 Hero 视频背景
│   ├── workflow-canvas.png          # 工作流预览图
│   ├── artifact-preview.png         # 产物中心预览图
│   ├── dashboard-preview.png        # 仪表盘预览图
│   └── noise-texture.png            # 噪点纹理叠加层
│
├── src/
│   ├── components/                  # 组件库
│   │   ├── ui/                      # shadcn/ui 基础组件（40+）
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...                  # 完整组件库
│   │   │
│   │   ├── Navbar.tsx               # 顶部导航栏
│   │   ├── Footer.tsx               # 页脚
│   │   ├── Layout.tsx               # 仪表盘侧边栏布局
│   │   │
│   │   ├── agents/                  # Agent管理模块
│   │   │   ├── data.ts              # 6个Agent的Mock数据
│   │   │   ├── AgentCard.tsx        # Agent卡片（网格/列表）
│   │   │   ├── AgentListView.tsx    # 列表视图
│   │   │   ├── AgentDetailDrawer.tsx # 详情抽屉
│   │   │   └── AddAgentModal.tsx    # 添加Agent向导
│   │   │
│   │   ├── workflows/               # 工作流编排模块
│   │   │   ├── types.ts             # 类型定义 + 3套模板数据
│   │   │   ├── CustomNode.tsx       # 自定义节点组件
│   │   │   ├── FlowCanvas.tsx       # 画布组件
│   │   │   ├── NodePalette.tsx      # 左侧节点面板
│   │   │   ├── PropertiesPanel.tsx  # 右侧属性面板
│   │   │   ├── ConsolePanel.tsx     # 底部控制台
│   │   │   ├── Toolbar.tsx          # 工具栏
│   │   │   └── TemplateSelector.tsx # 模板选择器
│   │   │
│   │   ├── artifacts/               # 产物中心模块
│   │   │   ├── types.ts             # 类型定义
│   │   │   ├── mockData.ts          # 演示数据
│   │   │   ├── FileTree.tsx         # 文件树浏览器
│   │   │   ├── CodePreview.tsx      # 代码预览（PrismJS）
│   │   │   ├── MarkdownPreview.tsx  # Markdown渲染
│   │   │   ├── JSONPreview.tsx      # JSON树形查看器
│   │   │   ├── CSVPreview.tsx       # CSV表格预览
│   │   │   ├── ImagePreview.tsx     # 图片预览
│   │   │   ├── InfoPanel.tsx        # 信息面板
│   │   │   ├── ReviewPanel.tsx      # 代码审查面板
│   │   │   └── VersionTimeline.tsx  # 版本时间线
│   │   │
│   │   └── settings/                # 设置模块
│   │       ├── GeneralTab.tsx       # 通用设置
│   │       ├── ConnectionsTab.tsx   # 连接配置
│   │       ├── SecurityTab.tsx      # 安全设置
│   │       ├── MonitoringTab.tsx    # 性能监控
│   │       └── LogsTab.tsx          # 日志审计
│   │
│   ├── pages/                       # 页面路由
│   │   ├── Home.tsx                 # 首页（落地页）
│   │   ├── Dashboard.tsx            # 仪表盘
│   │   ├── Agents.tsx               # 智能体管理
│   │   ├── Workflows.tsx            # 工作流编排
│   │   ├── Artifacts.tsx            # 产物中心
│   │   └── Settings.tsx             # 设置与监控
│   │
│   ├── hooks/                       # 自定义Hooks
│   ├── types/                       # 全局类型定义
│   ├── lib/                         # 工具函数
│   │   └── utils.ts                 # cn() 等辅助函数
│   │
│   ├── App.tsx                      # 根组件 + 路由配置
│   ├── main.tsx                     # 入口文件
│   └── index.css                    # 全局样式 + Tailwind
│
├── index.html                       # HTML模板
├── tailwind.config.js               # Tailwind主题配置
├── vite.config.ts                   # Vite构建配置
├── tsconfig.json                    # TypeScript配置
└── package.json                     # 依赖管理
```

### 1.3 技术栈清单

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 19 | UI框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 构建 | Vite | 7.2 | 构建工具与开发服务器 |
| 样式 | Tailwind CSS | 3.4 | 原子化CSS |
| 组件 | shadcn/ui | latest | 基础UI组件库 |
| 路由 | react-router-dom | 7.x | 客户端路由 |
| 动画 | Framer Motion | 12.x | 交互动画与页面过渡 |
| 动画 | GSAP + ScrollTrigger | 3.x | 滚动触发动画 |
| 滚动 | Lenis | 1.x | 平滑滚动 |
| 图表 | Recharts | 2.x | 数据可视化 |
| 节点图 | @xyflow/react | 12.x | 工作流画布引擎 |
| 代码高亮 | PrismJS | 1.x | 语法高亮 |
| 图标 | Lucide React | latest | 图标库 |
| 字体 | Space Grotesk | - | 标题字体 |
| 字体 | Inter | - | 正文字体 |
| 字体 | JetBrains Mono | - | 代码字体 |
| 字体 | Noto Sans SC | - | 中文字体 |
| Toast | Sonner | latest | 消息通知 |

### 1.4 设计系统

#### 色彩体系

| Token | Hex | 用途 |
|-------|-----|------|
| `bg-primary` | `#0A0E17` | 主背景 |
| `bg-secondary` | `#111827` | 卡片/面板背景 |
| `bg-elevated` | `#1A2234` | 悬浮面板 |
| `accent-cyan` | `#00D4FF` | 主强调色/CTA |
| `accent-green` | `#10B981` | 成功/在线状态 |
| `accent-amber` | `#F59E0B` | 警告/忙碌状态 |
| `accent-rose` | `#EF4444` | 错误/离线状态 |
| `accent-purple` | `#8B5CF6` | 远程Agent标识 |
| `accent-blue` | `#3B82F6` | 本地Agent标识 |
| `text-primary` | `#F1F5F9` | 主文字色 |
| `text-secondary` | `#94A3B8` | 次级文字色 |
| `text-muted` | `#64748B` | 辅助文字 |

#### 动画体系

| 动画 | 参数 | 触发条件 |
|------|------|----------|
| `fadeSlideUp` | translateY(24px) -> 0, opacity 0->1, 0.5s | 页面加载/滚动进入 |
| `fadeSlideLeft` | translateX(16px) -> 0, opacity 0->1, 0.4s | 侧边面板展开 |
| `scaleIn` | scale(0.95) -> 1, opacity 0->1, 0.3s | 模态框/弹窗 |
| `staggerChildren` | delay 0.08s 递增 | 列表/卡片网格 |
| `pulse-glow` | box-shadow 呼吸, 2s infinite | Agent在线状态 |
| `data-flow` | stroke-dasharray 流动, 1.5s | 工作流连接线 |

#### 布局规范

| 元素 | 规格 |
|------|------|
| 侧边导航 | 固定 240px (桌面) / 64px (平板) / 隐藏 (手机) |
| 顶部栏 | 固定 56px 高，backdrop-blur(12px) |
| 内容区最大宽度 | 1440px |
| 卡片网格 | repeat(auto-fill, minmax(320px, 1fr)) |
| 卡片圆角 | 12px |
| 按钮圆角 | 8px |

---

## 二、操作说明

### 2.1 快速开始

#### 本地部署步骤

```bash
# 1. 获取源码
cd /mnt/agents/output/app

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# 默认访问 http://localhost:5173

# 4. 构建生产版本
npm run build

# 5. 预览生产构建
npm run preview
```

#### Docker 部署（可选）

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

```bash
# 构建镜像
docker build -t agentnexus .

# 运行容器
docker run -d -p 8080:4173 --name agentnexus agentnexus
```

### 2.2 首页导航

打开应用后进入首页，展示平台价值主张和核心功能概览：

| 区域 | 操作 |
|------|------|
| 顶部导航 | 点击「进入控制台」跳转到仪表盘 |
| Agent矩阵 | 浏览6个Agent的图标、能力和状态 |
| 功能特性 | 查看4大核心功能的简要说明 |
| 工作流演示 | 查看可视化编排的截图展示 |
| CTA区域 | 复制 Docker 部署命令到剪贴板 |

### 2.3 仪表盘（Dashboard）

中央指挥中心，提供全局状态概览：

**顶部统计卡片区**
- 在线Agent数 / Agent总数
- 运行中任务数 / 总任务数
- 今日产物数
- 系统健康度百分比

**Agent状态网格**
- 每个Agent显示：图标、名称、状态指示灯、最近任务
- 状态灯颜色：绿色(在线)、琥珀色(忙碌)、红色(离线)
- 点击卡片跳转到Agent管理页

**实时任务流**
- 按时间倒序排列的最近任务
- 显示任务名称、执行Agent、状态、耗时

**系统健康**
- CPU、内存、网络使用率的迷你图表

### 2.4 智能体管理（Agents）

管理所有AI Agent的注册、配置和监控：

#### 查看Agent列表

- **网格视图**：卡片式布局，显示图标、名称、状态、能力标签
- **列表视图**：表格布局，显示详细指标（任务数、成功率、响应时间）
- **搜索**：按名称、能力、地址搜索
- **筛选**：全部 / 本地 / 远程 / 在线 / 离线

#### 添加Agent

1. 点击右上角「+ 添加Agent」按钮
2. **第1步 选择类型**：远程Agent 或 本地Agent
3. **第2步 配置连接**：
   - 远程Agent：填写名称、API端点URL、API密钥
   - 本地Agent：填写名称、本地路径/端口
4. **第3步 能力设置**：勾选该Agent支持的能力标签
5. **第4步 确认**：查看摘要并完成添加

#### 查看Agent详情

点击任意Agent卡片打开详情抽屉（右侧滑出）：
- **概览**：运行统计、能力标签、连接信息、资源使用
- **任务历史**：该Agent执行过的任务列表
- **日志**：实时终端风格日志流
- **配置**：编辑Agent参数

#### 支持的Agent类型

| Agent | 类型 | 默认能力 |
|-------|------|----------|
| OpenClaw | 远程 | 网页抓取、数据分析、自动化 |
| Hermes | 远程 | 消息路由、通知、集成 |
| Claude | 本地 | 代码生成、文档编写、推理 |
| Codex | 本地 | 代码补全、重构、审查 |
| Trae | 本地 | 代码编辑、终端操作、调试 |
| Cursor | 本地 | AI编程、代码生成、智能提示 |

### 2.5 工作流编排（Workflows）

可视化工作流设计器，支持拖拽式编排：

#### 画布操作

| 操作 | 方式 |
|------|------|
| 添加节点 | 从左侧面板拖拽节点到画布 |
| 连接节点 | 拖拽输出手柄到另一节点的输入手柄 |
| 删除节点 | 选中后按 Delete 键 |
| 选中节点 | 单击，右侧显示属性面板 |
| 移动画布 | 拖拽空白区域 |
| 缩放 | 工具栏 +/- 按钮或滚轮 |
| 适应视图 | 点击 100% 按钮 |

#### 节点类型

| 类别 | 节点 | 说明 |
|------|------|------|
| **Agent** | Claude / Codex / Trae / OpenClaw / Hermes / Cursor | 执行具体任务的Agent节点 |
| **控制** | 开始 / 结束 / 条件分支 / 循环 / 并行 / 合并 | 控制流程走向 |
| **数据** | 输入 / 输出 / 记忆 / 变量 | 数据传递和存储 |
| **工具** | HTTP请求 / 文件读写 / 代码执行 | 通用工具节点 |

#### 预置模板

- **自动化代码审查**：代码检查 -> 多Agent并行审查 -> 汇总报告
- **多Agent研究分析**：主题分发 -> 并行研究 -> 综合分析
- **数据处理管道**：数据提取 -> 转换 -> 加载

#### 运行工作流

1. 设计完成后点击「运行」按钮
2. 底部控制台实时显示执行日志
3. 节点状态实时变化：等待(灰) -> 运行中(蓝) -> 完成(绿) / 失败(红)
4. 运行完成后查看产物

#### 导出工作流

点击「导出」按钮将当前工作流保存为 JSON 文件，可分享给团队成员。

### 2.6 产物中心（Artifacts）

收集、查看和管理Agent产出的所有产物：

#### 文件浏览器

- 左侧树形文件目录，按项目/任务/Agent组织
- 支持展开/折叠文件夹
- 文件图标按类型着色
- 搜索框快速定位文件

#### 文件预览

点击文件后在主区域预览：

| 文件类型 | 预览方式 |
|----------|----------|
| JavaScript/TypeScript/Python/CSS/JSX/TSX | 语法高亮代码 |
| Markdown | 渲染后的富文本 |
| JSON | 可折叠的树形结构 |
| CSV | 表格视图，支持排序 |
| PNG/JPG | 图片预览，支持缩放 |

#### 代码审查

- 切换到「审查」标签
- 查看代码Diff（新增/删除行高亮）
- 添加行内评论批注
- 查看审查状态（待审查/已通过/需修改）

#### 版本历史

- 切换到「版本」标签
- 查看文件的完整版本时间线
- 对比任意两个版本
- 查看每个版本的修改统计

#### 操作

- **下载**：单个文件或批量导出
- **复制**：复制代码到剪贴板
- **分享**：生成分享链接
- **归档**：归档不再活跃的文件

### 2.7 设置与监控（Settings）

#### 通用设置

- 平台名称、工作区ID
- 时区与日期格式
- 主题模式（深色/浅色）
- 字体大小调节
- 动画效果开关
- 界面语言

#### 连接配置

- 为每个Agent配置API密钥和端点地址
- **测试连接**：验证Agent是否可达
- 连接状态实时显示
- WebSocket连接参数

**默认端点配置**：

| Agent | 默认地址 | 认证方式 |
|-------|----------|----------|
| OpenClaw | `http://localhost:3001` | API Key |
| Hermes | `http://localhost:3002` | API Key |
| Claude | `http://localhost:8080` | API Key |
| Codex | 本地进程 | 无需认证 |
| Trae | 本地进程 | 无需认证 |
| Cursor | 本地进程 | 无需认证 |

#### 安全设置

- API密钥管理与重新生成
- IP白名单配置
- CORS域名设置
- 认证方式（JWT / OAuth / 无认证）
- 审计日志开关
- 数据保留策略

#### 性能监控

- **响应时间图表**：各Agent响应时间趋势（折线图）
- **吞吐量图表**：每分钟处理任务数（面积图）
- **错误率图表**：任务失败率趋势
- **Token使用量**：各Agent的Token消耗
- **Agent性能排行**：横向柱状图对比

#### 告警规则

- CPU使用率阈值（默认80%）
- 内存使用率阈值（默认85%）
- Agent离线通知
- 任务失败率阈值
- 自定义Webhook通知

#### 日志审计

- 系统日志实时查看
- 按级别筛选：DEBUG / INFO / WARN / ERROR
- 按Agent来源筛选
- 按时间范围筛选
- 搜索日志内容
- 实时滚动（Live Tail）模式

---

## 三、核心概念

### 3.1 Agent

Agent是平台上的基本执行单元，代表一个具体的AI工具或服务。

**属性**：
- `id`: 唯一标识
- `name`: 显示名称
- `type`: 类型（local / remote）
- `status`: 状态（online / offline / busy）
- `capabilities`: 能力标签数组
- `endpoint`: 连接地址
- `lastActive`: 最后活跃时间

### 3.2 工作流（Workflow）

工作流是由多个节点通过边连接而成的有向图，定义了任务的执行流程。

**关键特性**：
- 节点代表执行单元（Agent/控制/数据/工具）
- 边代表数据流向和控制依赖
- 支持条件分支和并行执行
- 数据在节点间通过上下文传递

### 3.3 产物（Artifact）

产物是Agent执行任务后输出的可交付成果。

**类型**：
- 代码文件（JS/TS/Python/HTML/CSS等）
- 文档（Markdown/纯文本）
- 数据文件（JSON/CSV/YAML）
- 图片/截图
- 分析报告

### 3.4 会话（Session）

会话是Agent间协作的临时上下文环境。

**生命周期**：
1. 创建工作流实例
2. 按图执行节点
3. 节点间共享上下文
4. 收集产物
5. 归档或导出结果

---

## 四、后续迭代开发路线图

### Phase 1: 后端集成（优先）

#### 4.1.1 REST API 层

```typescript
// 需要实现的后端接口

// Agent管理
GET    /api/agents              // 获取Agent列表
POST   /api/agents              // 创建Agent
GET    /api/agents/:id          // 获取Agent详情
PUT    /api/agents/:id          // 更新Agent
DELETE /api/agents/:id          // 删除Agent
POST   /api/agents/:id/test     // 测试连接
GET    /api/agents/:id/logs     // 获取Agent日志

// 工作流
GET    /api/workflows           // 获取工作流列表
POST   /api/workflows           // 创建工作流
GET    /api/workflows/:id       // 获取工作流详情
PUT    /api/workflows/:id       // 更新工作流
DELETE /api/workflows/:id       // 删除工作流
POST   /api/workflows/:id/run   // 运行工作流
GET    /api/workflows/:id/runs  // 获取执行历史

// 产物
GET    /api/artifacts           // 获取产物列表
GET    /api/artifacts/:id       // 获取产物详情
GET    /api/artifacts/:id/download // 下载产物
POST   /api/artifacts/:id/review // 提交审查意见
GET    /api/artifacts/:id/versions // 获取版本历史

// 监控
GET    /api/metrics/agents      // Agent性能指标
GET    /api/metrics/system      // 系统资源指标
GET    /api/metrics/workflows   // 工作流统计
GET    /api/logs                // 系统日志

// 设置
GET    /api/settings            // 获取设置
PUT    /api/settings            // 更新设置
```

#### 4.1.2 WebSocket 实时通信

```typescript
// WebSocket 事件
ws.on('agent.status', (data) => { /* Agent状态变更 */ })
ws.on('agent.log', (data) => { /* Agent实时日志 */ })
ws.on('workflow.run.step', (data) => { /* 工作流执行步骤 */ })
ws.on('workflow.run.complete', (data) => { /* 工作流完成 */ })
ws.on('artifact.new', (data) => { /* 新产物通知 */ })
ws.on('system.alert', (data) => { /* 系统告警 */ })
```

#### 4.1.3 数据持久化

| 存储 | 用途 | 推荐方案 |
|------|------|----------|
| 关系型数据库 | Agent配置、工作流定义、用户信息 | PostgreSQL / SQLite |
| 时序数据库 | 性能指标、日志 | InfluxDB / TimescaleDB |
| 对象存储 | 产物文件 | 本地文件系统 / MinIO |
| 缓存 | 会话状态、实时数据 | Redis |

### Phase 2: 多Agent协议适配

#### 4.2.1 MCP (Model Context Protocol) 支持

实现MCP协议适配器，统一接入各种支持MCP的Agent：

```typescript
// MCP适配器接口
interface MCPAdapter {
  connect(config: MCPConfig): Promise<Connection>
  listTools(): Promise<Tool[]>
  callTool(name: string, args: Record<string, any>): Promise<ToolResult>
  listResources(): Promise<Resource[]>
  readResource(uri: string): Promise<ResourceContent>
}
```

#### 4.2.2 Agent专用适配器

| Agent | 协议 | 适配器实现 |
|-------|------|------------|
| Claude | MCP / HTTP | ClaudeAdapter |
| Codex | VS Code Extension API | CodexAdapter |
| OpenClaw | REST API | OpenClawAdapter |
| Hermes | WebSocket / REST | HermesAdapter |
| Trae | VS Code Extension API | TraeAdapter |
| Cursor | VS Code Extension API | CursorAdapter |

#### 4.2.3 A2A (Agent-to-Agent) 通信

实现Agent间直接通信协议：

```typescript
interface A2AMessage {
  from: string      // 发送Agent ID
  to: string        // 接收Agent ID
  type: 'task' | 'query' | 'response' | 'handoff'
  payload: any
  context: Context  // 共享上下文
}
```

### Phase 3: 高级功能

#### 4.3.1 智能任务路由

```typescript
// 基于Agent能力和负载自动分配任务
interface TaskRouter {
  // 根据任务描述匹配最佳Agent
  match(task: TaskDescription): Agent[]
  
  // 负载均衡
  balance(agents: Agent[]): Agent
  
  // 故障转移
  failover(agent: Agent): Agent
}
```

#### 4.3.2 自动工作流生成

- 自然语言描述任务 -> 自动生成工作流
- 基于历史执行数据优化工作流
- 工作流模板推荐

#### 4.3.3 协作模式增强

- **顺序协作**：Agent A 完成 -> Agent B 继续
- **并行协作**：多个Agent同时处理不同部分
- **评审模式**：Agent生成 -> 另一Agent审查 -> 修改循环
- **竞争模式**：多个Agent同时解决同一问题，取最优结果

### Phase 4: 企业级功能

#### 4.4.1 用户与权限

```
角色体系：
- 超级管理员：全部权限
- 管理员：管理Agent和工作流，查看所有数据
- 开发者：创建工作流、运行任务、查看产物
- 观察者：只读访问
```

#### 4.4.2 团队协作

- 工作空间（Workspace）隔离
- 工作流共享与权限控制
- 产物共享链接（带过期时间）
- 评论与审批流程

#### 4.4.3 审计与合规

- 完整操作审计日志
- 数据加密存储
- SOC2 / GDPR 合规支持
- 审计报告导出

### Phase 5: 性能优化

#### 4.5.1 前端优化

| 优化项 | 方案 | 预期收益 |
|--------|------|----------|
| 代码分割 | 按路由动态导入 | 首屏加载 -60% |
| 虚拟滚动 | Agent列表/产物列表 | 大数据量流畅 |
| 缓存策略 | SWR/React Query | 减少重复请求 |
| Web Worker | 语法高亮/JSON解析 | 不阻塞主线程 |
| Service Worker | PWA离线支持 | 离线可用 |

#### 4.5.2 后端优化

| 优化项 | 方案 | 预期收益 |
|--------|------|----------|
| 连接池 | Agent连接复用 | 减少连接开销 |
| 流式传输 | SSE/Stream Response | 实时反馈 |
| 任务队列 | Bull / Celery | 可靠执行 |
| 水平扩展 | 多实例部署 | 支持更多Agent |

### Phase 6: 生态集成

#### 4.6.1 CI/CD 集成

- GitHub Actions / GitLab CI 插件
- Jenkins 插件
- 工作流触发 Webhook

#### 4.6.2 IDE 插件

- VS Code 扩展：侧边栏管理Agent
- JetBrains 插件
- Neovim 插件

#### 4.6.3 第三方服务

| 服务 | 集成方式 | 用途 |
|------|----------|------|
| Slack | Webhook + Bot | 通知与交互 |
| Discord | Webhook + Bot | 通知与交互 |
| GitHub | API + Webhook | 代码仓库操作 |
| Jira | API | 任务管理同步 |
| Notion | API | 文档同步 |

---

## 五、开发指南

### 5.1 添加新页面

```bash
# 1. 创建页面组件
src/pages/NewPage.tsx

# 2. 在 App.tsx 添加路由
import NewPage from '@/pages/NewPage'
<Route path="/new-page" element={<NewPage />} />

# 3. 在 Layout.tsx 侧边栏添加导航项
```

### 5.2 添加新Agent类型

```typescript
// src/components/agents/data.ts
export interface Agent {
  id: string
  name: string
  type: 'local' | 'remote'
  status: 'online' | 'offline' | 'busy'
  capabilities: string[]
  endpoint: string
  lastActive: string
}

// 添加新的Agent数据
const newAgent: Agent = {
  id: 'new-agent',
  name: 'New Agent',
  type: 'remote',
  status: 'online',
  capabilities: ['代码生成', '文档编写'],
  endpoint: 'http://localhost:3003',
  lastActive: new Date().toISOString()
}
```

### 5.3 添加新工作流节点类型

```typescript
// src/components/workflows/types.ts
export type NodeType = 
  | 'claude' | 'codex' | 'trae' | 'openclaw' | 'hermes' | 'cursor'
  | 'start' | 'end' | 'condition' | 'loop' | 'parallel' | 'merge'
  | 'input' | 'output' | 'memory' | 'variable'
  | 'http' | 'file' | 'code'
  | 'new-node' // 添加新节点类型
```

### 5.4 自定义主题

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0A0E17',
        'accent-cyan': '#00D4FF',
        // 添加自定义颜色
        'custom-accent': '#FF6B6B',
      }
    }
  }
}
```

---

## 六、常见问题

### Q: 如何连接真实的Agent？

A: 进入「设置 → 连接配置」，填写Agent的API端点地址和密钥，点击「测试连接」验证。当前版本前端已预留接口，需要对接后端服务实现真实通信。

### Q: 工作流如何保存和分享？

A: 工作流页面右上角点击「导出」按钮，将工作流保存为JSON文件。可以通过邮件、Slack等方式分享给团队成员。接收方在导入功能上线后可以导入使用。

### Q: 产物存储在哪里？

A: 当前演示版本产物为前端Mock数据。生产版本需要对接后端API和对象存储服务（如MinIO、S3等）。

### Q: 是否支持多用户协作？

A: 当前版本为单用户本地部署。多用户协作功能在 Phase 4 企业级功能中规划实现。

### Q: 如何监控Agent运行状态？

A: 通过「仪表盘」查看实时状态，「设置 → 监控」查看历史性能图表，「设置 → 日志」查看详细运行日志。建议配置告警规则以便及时发现异常。

---

## 七、技术债务与注意事项

### 当前已知限制

| 限制 | 说明 | 解决计划 |
|------|------|----------|
| 纯前端实现 | 所有数据为Mock，无持久化 | Phase 1 后端集成 |
| 工作流无真实执行 | 执行状态为模拟动画 | Phase 1 后端集成 |
| 无用户认证 | 任何人可访问 | Phase 4 权限系统 |
| 无多用户支持 | 单用户使用 | Phase 4 团队协作 |
| 产物为静态数据 | 无法真实生成和存储 | Phase 1 产物存储 |
| 构建体积较大 | 1.4MB JS bundle | Phase 5 代码分割优化 |

### 升级注意事项

1. **React 19 兼容性**：当前使用 React 19，升级到更新版本时需注意 API 变更
2. **Vite 版本**：跟随 Vite 官方升级指南
3. **Tailwind v3 -> v4**：Tailwind CSS v4 有重大变更，升级需评估
4. **TypeScript**：保持严格模式，定期更新类型定义

---

*AgentNexus v1.0 - 2026年5月*
*文档版本：1.0*
