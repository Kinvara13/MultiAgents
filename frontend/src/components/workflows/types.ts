// Node status types
export type NodeStatus = 'idle' | 'running' | 'completed' | 'error'

// Node category types
export type NodeCategory = 'agent' | 'control' | 'data' | 'tool'

// Node type identifiers
export type AgentNodeType = 'claude' | 'codex' | 'trae' | 'openclaw' | 'hermes' | 'cursor'
export type ControlNodeType = 'start' | 'end' | 'condition' | 'loop' | 'parallel' | 'merge' | 'wait' | 'human'
export type DataNodeType = 'input' | 'output' | 'memory'
export type ToolNodeType = 'http' | 'file' | 'database' | 'message' | 'package'

export type WorkflowNodeType = AgentNodeType | ControlNodeType | DataNodeType | ToolNodeType

// Node definition for palette
export interface NodeDefinition {
  type: WorkflowNodeType
  category: NodeCategory
  label: string
  color: string
  icon: string
  description: string
  inputs: number
  outputs: number
}

// Agent node configuration
export interface AgentNodeConfig {
  agentId?: string
  taskDescription: string
  inputVariables: Record<string, string>
  timeout: number
  retryCount: number
  failureAction: 'stop' | 'skip' | 'retry'
  outputVariable: string
}

// Condition node configuration
export interface ConditionNodeConfig {
  expression: string
  variableRef: string
  operator: 'eq' | 'ne' | 'contains' | 'gt' | 'lt'
  trueLabel: string
  falseLabel: string
}

// Node configuration
export interface NodeConfig {
  label: string
  description: string
  colorTag?: string
  notes: string
  agent?: AgentNodeConfig
  condition?: ConditionNodeConfig
  [key: string]: unknown
}

// Workflow node data for React Flow
export interface WorkflowNodeData {
  label: string
  type: WorkflowNodeType
  category: NodeCategory
  status: NodeStatus
  color: string
  icon: string
  description: string
  config: NodeConfig
  [key: string]: unknown
}

// Log entry
export interface LogEntry {
  id: string
  timestamp: string
  nodeId?: string
  nodeName?: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

// Workflow definition
export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  nodes: Array<{
    id: string
    type: WorkflowNodeType
    position: { x: number; y: number }
    data: WorkflowNodeData
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    label?: string
    type?: string
  }>
}

// Palette node definitions
export const AGENT_NODES: NodeDefinition[] = [
  { type: 'claude', category: 'agent', label: 'Claude', color: '#3B82F6', icon: 'MessageSquare', description: '本地 Agent 执行节点', inputs: 1, outputs: 1 },
  { type: 'codex', category: 'agent', label: 'Codex', color: '#00D4FF', icon: 'Code', description: '本地 Agent 执行节点', inputs: 1, outputs: 1 },
  { type: 'trae', category: 'agent', label: 'Trae', color: '#10B981', icon: 'Terminal', description: '本地 Agent 执行节点', inputs: 1, outputs: 1 },
  { type: 'openclaw', category: 'agent', label: 'OpenClaw', color: '#8B5CF6', icon: 'Zap', description: '远程 Agent 执行节点', inputs: 1, outputs: 1 },
  { type: 'hermes', category: 'agent', label: 'Hermes', color: '#F59E0B', icon: 'Mail', description: '远程 Agent 执行节点', inputs: 1, outputs: 1 },
  { type: 'cursor', category: 'agent', label: 'Cursor', color: '#8B5CF6', icon: 'MousePointer', description: '本地 Agent 执行节点', inputs: 1, outputs: 1 },
]

export const CONTROL_NODES: NodeDefinition[] = [
  { type: 'start', category: 'control', label: '开始', color: '#10B981', icon: 'Play', description: '工作流入口', inputs: 0, outputs: 1 },
  { type: 'end', category: 'control', label: '结束', color: '#EF4444', icon: 'Square', description: '工作流出口', inputs: 1, outputs: 0 },
  { type: 'condition', category: 'control', label: '条件', color: '#00D4FF', icon: 'GitBranch', description: 'IF/ELSE 分支', inputs: 1, outputs: 2 },
  { type: 'loop', category: 'control', label: '循环', color: '#8B5CF6', icon: 'RefreshCw', description: 'FOR/WHILE 循环', inputs: 1, outputs: 2 },
  { type: 'parallel', category: 'control', label: '并行', color: '#F59E0B', icon: 'Split', description: '并行执行分叉', inputs: 1, outputs: 2 },
  { type: 'merge', category: 'control', label: '合并', color: '#F59E0B', icon: 'Merge', description: '并行结果合并', inputs: 2, outputs: 1 },
  { type: 'wait', category: 'control', label: '等待', color: '#64748B', icon: 'Clock', description: '延时等待', inputs: 1, outputs: 1 },
  { type: 'human', category: 'control', label: '人工审核', color: '#3B82F6', icon: 'UserCheck', description: '人工介入点', inputs: 1, outputs: 1 },
]

export const DATA_NODES: NodeDefinition[] = [
  { type: 'input', category: 'data', label: '输入', color: '#00D4FF', icon: 'Download', description: '数据输入', inputs: 0, outputs: 1 },
  { type: 'output', category: 'data', label: '输出', color: '#00D4FF', icon: 'Upload', description: '数据输出', inputs: 1, outputs: 0 },
  { type: 'memory', category: 'data', label: '记忆', color: '#8B5CF6', icon: 'Database', description: '存储变量', inputs: 1, outputs: 1 },
]

export const TOOL_NODES: NodeDefinition[] = [
  { type: 'http', category: 'tool', label: 'HTTP 请求', color: '#3B82F6', icon: 'Globe', description: '调用外部 API', inputs: 1, outputs: 1 },
  { type: 'file', category: 'tool', label: '文件操作', color: '#94A3B8', icon: 'FileCode', description: '读写文件', inputs: 1, outputs: 1 },
  { type: 'database', category: 'tool', label: '数据库', color: '#8B5CF6', icon: 'Database', description: 'SQL 查询', inputs: 1, outputs: 1 },
  { type: 'message', category: 'tool', label: '消息', color: '#10B981', icon: 'MessageSquare', description: '发送通知', inputs: 1, outputs: 1 },
  { type: 'package', category: 'tool', label: '产物收集', color: '#F59E0B', icon: 'Package', description: '收集并归档产物', inputs: 1, outputs: 1 },
]

export const ALL_NODE_DEFINITIONS: NodeDefinition[] = [
  ...AGENT_NODES,
  ...CONTROL_NODES,
  ...DATA_NODES,
  ...TOOL_NODES,
]

// Example workflow 1: Code Review Pipeline
export const CODE_REVIEW_WORKFLOW: WorkflowDefinition = {
  id: 'code-review',
  name: '自动化代码审查',
  description: '多 Agent 协同的 PR 代码审查流程',
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 50, y: 200 },
      data: {
        label: '开始',
        type: 'start',
        category: 'control',
        status: 'completed',
        color: '#10B981',
        icon: 'Play',
        description: '工作流入口',
        config: { label: '开始', description: '', notes: '' },
      },
    },
    {
      id: 'claude-1',
      type: 'claude',
      position: { x: 280, y: 200 },
      data: {
        label: 'Claude: 读取 PR',
        type: 'claude',
        category: 'agent',
        status: 'completed',
        color: '#3B82F6',
        icon: 'MessageSquare',
        description: '读取并分析 PR 描述',
        config: {
          label: 'Claude: 读取 PR',
          description: '读取并分析 PR 描述',
          notes: '',
          agent: {
            agentId: 'claude-main',
            taskDescription: '读取 PR 描述，提取关键变更点和测试需求',
            inputVariables: { pr_url: 'input.pr_url' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'stop',
            outputVariable: 'pr_analysis',
          },
        },
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 540, y: 200 },
      data: {
        label: '有测试文件？',
        type: 'condition',
        category: 'control',
        status: 'completed',
        color: '#00D4FF',
        icon: 'GitBranch',
        description: '检查 PR 是否包含测试文件',
        config: {
          label: '有测试文件？',
          description: '检查 PR 是否包含测试文件',
          notes: '',
          condition: {
            expression: 'has_test_files',
            variableRef: 'pr_analysis.has_tests',
            operator: 'eq',
            trueLabel: '是',
            falseLabel: '否',
          },
        },
      },
    },
    {
      id: 'codex-1',
      type: 'codex',
      position: { x: 820, y: 100 },
      data: {
        label: 'Codex: 审查测试',
        type: 'codex',
        category: 'agent',
        status: 'completed',
        color: '#00D4FF',
        icon: 'Code',
        description: '审查测试代码质量',
        config: {
          label: 'Codex: 审查测试',
          description: '审查测试代码质量',
          notes: '',
          agent: {
            agentId: 'codex-reviewer',
            taskDescription: '审查测试代码的覆盖率和正确性',
            inputVariables: { test_files: 'pr_analysis.test_files' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'retry',
            outputVariable: 'test_review',
          },
        },
      },
    },
    {
      id: 'codex-2',
      type: 'codex',
      position: { x: 820, y: 300 },
      data: {
        label: 'Codex: 生成测试',
        type: 'codex',
        category: 'agent',
        status: 'idle',
        color: '#00D4FF',
        icon: 'Code',
        description: '为缺失的测试生成代码',
        config: {
          label: 'Codex: 生成测试',
          description: '为缺失的测试生成代码',
          notes: '',
          agent: {
            agentId: 'codex-generator',
            taskDescription: '根据变更代码生成对应测试用例',
            inputVariables: { changes: 'pr_analysis.changes' },
            timeout: 600,
            retryCount: 3,
            failureAction: 'skip',
            outputVariable: 'generated_tests',
          },
        },
      },
    },
    {
      id: 'parallel-1',
      type: 'parallel',
      position: { x: 1120, y: 200 },
      data: {
        label: '并行审查',
        type: 'parallel',
        category: 'control',
        status: 'idle',
        color: '#F59E0B',
        icon: 'Split',
        description: '并行执行代码审查和测试运行',
        config: { label: '并行审查', description: '', notes: '' },
      },
    },
    {
      id: 'claude-2',
      type: 'claude',
      position: { x: 1400, y: 100 },
      data: {
        label: 'Claude: 审查代码',
        type: 'claude',
        category: 'agent',
        status: 'idle',
        color: '#3B82F6',
        icon: 'MessageSquare',
        description: '审查代码质量和规范',
        config: {
          label: 'Claude: 审查代码',
          description: '审查代码质量和规范',
          notes: '',
          agent: {
            agentId: 'claude-reviewer',
            taskDescription: '审查代码质量、安全性和最佳实践',
            inputVariables: { code: 'pr_analysis.changes' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'stop',
            outputVariable: 'code_review',
          },
        },
      },
    },
    {
      id: 'trae-1',
      type: 'trae',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Trae: 运行测试',
        type: 'trae',
        category: 'agent',
        status: 'idle',
        color: '#10B981',
        icon: 'Terminal',
        description: '运行测试套件',
        config: {
          label: 'Trae: 运行测试',
          description: '运行测试套件',
          notes: '',
          agent: {
            agentId: 'trae-runner',
            taskDescription: '运行完整测试套件并收集结果',
            inputVariables: { test_files: 'pr_analysis.test_files' },
            timeout: 600,
            retryCount: 1,
            failureAction: 'stop',
            outputVariable: 'test_results',
          },
        },
      },
    },
    {
      id: 'merge-1',
      type: 'merge',
      position: { x: 1700, y: 200 },
      data: {
        label: '合并结果',
        type: 'merge',
        category: 'control',
        status: 'idle',
        color: '#F59E0B',
        icon: 'Merge',
        description: '合并并行审查结果',
        config: { label: '合并结果', description: '', notes: '' },
      },
    },
    {
      id: 'condition-2',
      type: 'condition',
      position: { x: 1960, y: 200 },
      data: {
        label: '全部通过？',
        type: 'condition',
        category: 'control',
        status: 'idle',
        color: '#00D4FF',
        icon: 'GitBranch',
        description: '检查审查是否全部通过',
        config: {
          label: '全部通过？',
          description: '',
          notes: '',
          condition: {
            expression: 'all_passed',
            variableRef: 'merge_results.status',
            operator: 'eq',
            trueLabel: '是',
            falseLabel: '否',
          },
        },
      },
    },
    {
      id: 'package-1',
      type: 'package',
      position: { x: 2260, y: 100 },
      data: {
        label: '产物收集',
        type: 'package',
        category: 'tool',
        status: 'idle',
        color: '#F59E0B',
        icon: 'Package',
        description: '收集审查产物',
        config: { label: '产物收集', description: '', notes: '' },
      },
    },
    {
      id: 'message-1',
      type: 'message',
      position: { x: 2260, y: 300 },
      data: {
        label: '通知: 需人工介入',
        type: 'message',
        category: 'tool',
        status: 'idle',
        color: '#10B981',
        icon: 'MessageSquare',
        description: '发送通知给负责人',
        config: { label: '通知: 需人工介入', description: '', notes: '' },
      },
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 2560, y: 200 },
      data: {
        label: '结束',
        type: 'end',
        category: 'control',
        status: 'idle',
        color: '#EF4444',
        icon: 'Square',
        description: '工作流出口',
        config: { label: '结束', description: '', notes: '' },
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start-1', target: 'claude-1', type: 'default' },
    { id: 'e2', source: 'claude-1', target: 'condition-1', type: 'default' },
    { id: 'e3', source: 'condition-1', target: 'codex-1', label: '是', type: 'default' },
    { id: 'e4', source: 'condition-1', target: 'codex-2', label: '否', type: 'default' },
    { id: 'e5', source: 'codex-1', target: 'parallel-1', type: 'default' },
    { id: 'e6', source: 'codex-2', target: 'parallel-1', type: 'default' },
    { id: 'e7', source: 'parallel-1', target: 'claude-2', type: 'default' },
    { id: 'e8', source: 'parallel-1', target: 'trae-1', type: 'default' },
    { id: 'e9', source: 'claude-2', target: 'merge-1', type: 'default' },
    { id: 'e10', source: 'trae-1', target: 'merge-1', type: 'default' },
    { id: 'e11', source: 'merge-1', target: 'condition-2', type: 'default' },
    { id: 'e12', source: 'condition-2', target: 'package-1', label: '是', type: 'default' },
    { id: 'e13', source: 'condition-2', target: 'message-1', label: '否', type: 'default' },
    { id: 'e14', source: 'package-1', target: 'end-1', type: 'default' },
    { id: 'e15', source: 'message-1', target: 'end-1', type: 'default' },
  ],
}

// Example workflow 2: Multi-Agent Research
export const RESEARCH_WORKFLOW: WorkflowDefinition = {
  id: 'multi-agent-research',
  name: '多 Agent 研究分析',
  description: '多个 Agent 并行进行信息收集和分析',
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 50, y: 200 },
      data: {
        label: '开始',
        type: 'start',
        category: 'control',
        status: 'completed',
        color: '#10B981',
        icon: 'Play',
        description: '工作流入口',
        config: { label: '开始', description: '', notes: '' },
      },
    },
    {
      id: 'input-1',
      type: 'input',
      position: { x: 280, y: 200 },
      data: {
        label: '研究主题',
        type: 'input',
        category: 'data',
        status: 'completed',
        color: '#00D4FF',
        icon: 'Download',
        description: '输入研究主题',
        config: { label: '研究主题', description: '', notes: '' },
      },
    },
    {
      id: 'parallel-1',
      type: 'parallel',
      position: { x: 520, y: 200 },
      data: {
        label: '并行研究',
        type: 'parallel',
        category: 'control',
        status: 'running',
        color: '#F59E0B',
        icon: 'Split',
        description: '分派多个 Agent 并行研究',
        config: { label: '并行研究', description: '', notes: '' },
      },
    },
    {
      id: 'openclaw-1',
      type: 'openclaw',
      position: { x: 800, y: 50 },
      data: {
        label: 'OpenClaw: 搜索',
        type: 'openclaw',
        category: 'agent',
        status: 'running',
        color: '#8B5CF6',
        icon: 'Zap',
        description: '全网信息搜索',
        config: {
          label: 'OpenClaw: 搜索',
          description: '全网信息搜索',
          notes: '',
          agent: {
            agentId: 'openclaw-searcher',
            taskDescription: '搜索相关信息和最新动态',
            inputVariables: { topic: 'input.topic' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'retry',
            outputVariable: 'search_results',
          },
        },
      },
    },
    {
      id: 'hermes-1',
      type: 'hermes',
      position: { x: 800, y: 200 },
      data: {
        label: 'Hermes: 分析',
        type: 'hermes',
        category: 'agent',
        status: 'running',
        color: '#F59E0B',
        icon: 'Mail',
        description: '深度数据分析',
        config: {
          label: 'Hermes: 分析',
          description: '深度数据分析',
          notes: '',
          agent: {
            agentId: 'hermes-analyst',
            taskDescription: '分析数据趋势和模式',
            inputVariables: { topic: 'input.topic' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'retry',
            outputVariable: 'analysis_results',
          },
        },
      },
    },
    {
      id: 'claude-1',
      type: 'claude',
      position: { x: 800, y: 350 },
      data: {
        label: 'Claude: 整理',
        type: 'claude',
        category: 'agent',
        status: 'idle',
        color: '#3B82F6',
        icon: 'MessageSquare',
        description: '整理和归纳信息',
        config: {
          label: 'Claude: 整理',
          description: '整理和归纳信息',
          notes: '',
          agent: {
            agentId: 'claude-organizer',
            taskDescription: '整理和归纳收集到的信息',
            inputVariables: { topic: 'input.topic' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'retry',
            outputVariable: 'organized_info',
          },
        },
      },
    },
    {
      id: 'merge-1',
      type: 'merge',
      position: { x: 1120, y: 200 },
      data: {
        label: '合并研究',
        type: 'merge',
        category: 'control',
        status: 'idle',
        color: '#F59E0B',
        icon: 'Merge',
        description: '合并研究结果',
        config: { label: '合并研究', description: '', notes: '' },
      },
    },
    {
      id: 'claude-2',
      type: 'claude',
      position: { x: 1380, y: 200 },
      data: {
        label: 'Claude: 综合报告',
        type: 'claude',
        category: 'agent',
        status: 'idle',
        color: '#3B82F6',
        icon: 'MessageSquare',
        description: '生成综合研究报告',
        config: {
          label: 'Claude: 综合报告',
          description: '生成综合研究报告',
          notes: '',
          agent: {
            agentId: 'claude-reporter',
            taskDescription: '基于所有研究结果生成综合报告',
            inputVariables: { research: 'merge_results' },
            timeout: 600,
            retryCount: 2,
            failureAction: 'stop',
            outputVariable: 'final_report',
          },
        },
      },
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 1640, y: 200 },
      data: {
        label: '输出报告',
        type: 'output',
        category: 'data',
        status: 'idle',
        color: '#00D4FF',
        icon: 'Upload',
        description: '输出最终报告',
        config: { label: '输出报告', description: '', notes: '' },
      },
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 1880, y: 200 },
      data: {
        label: '结束',
        type: 'end',
        category: 'control',
        status: 'idle',
        color: '#EF4444',
        icon: 'Square',
        description: '工作流出口',
        config: { label: '结束', description: '', notes: '' },
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start-1', target: 'input-1', type: 'default' },
    { id: 'e2', source: 'input-1', target: 'parallel-1', type: 'default' },
    { id: 'e3', source: 'parallel-1', target: 'openclaw-1', type: 'default' },
    { id: 'e4', source: 'parallel-1', target: 'hermes-1', type: 'default' },
    { id: 'e5', source: 'parallel-1', target: 'claude-1', type: 'default' },
    { id: 'e6', source: 'openclaw-1', target: 'merge-1', type: 'default' },
    { id: 'e7', source: 'hermes-1', target: 'merge-1', type: 'default' },
    { id: 'e8', source: 'claude-1', target: 'merge-1', type: 'default' },
    { id: 'e9', source: 'merge-1', target: 'claude-2', type: 'default' },
    { id: 'e10', source: 'claude-2', target: 'output-1', type: 'default' },
    { id: 'e11', source: 'output-1', target: 'end-1', type: 'default' },
  ],
}

// Example workflow 3: Data Processing Pipeline
export const DATA_PIPELINE_WORKFLOW: WorkflowDefinition = {
  id: 'data-pipeline',
  name: '数据处理管道',
  description: 'ETL 数据处理流水线',
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 50, y: 200 },
      data: {
        label: '开始',
        type: 'start',
        category: 'control',
        status: 'completed',
        color: '#10B981',
        icon: 'Play',
        description: '工作流入口',
        config: { label: '开始', description: '', notes: '' },
      },
    },
    {
      id: 'input-1',
      type: 'input',
      position: { x: 280, y: 200 },
      data: {
        label: '数据输入',
        type: 'input',
        category: 'data',
        status: 'completed',
        color: '#00D4FF',
        icon: 'Download',
        description: '原始数据输入',
        config: { label: '数据输入', description: '', notes: '' },
      },
    },
    {
      id: 'codex-1',
      type: 'codex',
      position: { x: 540, y: 200 },
      data: {
        label: 'Codex: 清洗',
        type: 'codex',
        category: 'agent',
        status: 'completed',
        color: '#00D4FF',
        icon: 'Code',
        description: '数据清洗和预处理',
        config: {
          label: 'Codex: 清洗',
          description: '数据清洗和预处理',
          notes: '',
          agent: {
            agentId: 'codex-cleaner',
            taskDescription: '清洗和标准化原始数据',
            inputVariables: { raw_data: 'input.data' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'stop',
            outputVariable: 'cleaned_data',
          },
        },
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 820, y: 200 },
      data: {
        label: '数据有效？',
        type: 'condition',
        category: 'control',
        status: 'running',
        color: '#00D4FF',
        icon: 'GitBranch',
        description: '验证数据质量',
        config: {
          label: '数据有效？',
          description: '',
          notes: '',
          condition: {
            expression: 'is_valid',
            variableRef: 'cleaned_data.valid',
            operator: 'eq',
            trueLabel: '是',
            falseLabel: '否',
          },
        },
      },
    },
    {
      id: 'claude-1',
      type: 'claude',
      position: { x: 1120, y: 100 },
      data: {
        label: 'Claude: 转换',
        type: 'claude',
        category: 'agent',
        status: 'idle',
        color: '#3B82F6',
        icon: 'MessageSquare',
        description: '数据格式转换',
        config: {
          label: 'Claude: 转换',
          description: '数据格式转换',
          notes: '',
          agent: {
            agentId: 'claude-transformer',
            taskDescription: '将数据转换为目标格式',
            inputVariables: { data: 'cleaned_data' },
            timeout: 300,
            retryCount: 2,
            failureAction: 'retry',
            outputVariable: 'transformed_data',
          },
        },
      },
    },
    {
      id: 'trae-1',
      type: 'trae',
      position: { x: 1120, y: 300 },
      data: {
        label: 'Trae: 错误处理',
        type: 'trae',
        category: 'agent',
        status: 'idle',
        color: '#10B981',
        icon: 'Terminal',
        description: '处理异常数据',
        config: {
          label: 'Trae: 错误处理',
          description: '处理异常数据',
          notes: '',
          agent: {
            agentId: 'trae-error-handler',
            taskDescription: '记录并处理异常数据',
            inputVariables: { errors: 'cleaned_data.errors' },
            timeout: 300,
            retryCount: 1,
            failureAction: 'skip',
            outputVariable: 'error_log',
          },
        },
      },
    },
    {
      id: 'memory-1',
      type: 'memory',
      position: { x: 1400, y: 200 },
      data: {
        label: '记忆: 存储',
        type: 'memory',
        category: 'data',
        status: 'idle',
        color: '#8B5CF6',
        icon: 'Database',
        description: '存储处理结果',
        config: { label: '记忆: 存储', description: '', notes: '' },
      },
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 1660, y: 200 },
      data: {
        label: '数据输出',
        type: 'output',
        category: 'data',
        status: 'idle',
        color: '#00D4FF',
        icon: 'Upload',
        description: '输出最终结果',
        config: { label: '数据输出', description: '', notes: '' },
      },
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 1900, y: 200 },
      data: {
        label: '结束',
        type: 'end',
        category: 'control',
        status: 'idle',
        color: '#EF4444',
        icon: 'Square',
        description: '工作流出口',
        config: { label: '结束', description: '', notes: '' },
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start-1', target: 'input-1', type: 'default' },
    { id: 'e2', source: 'input-1', target: 'codex-1', type: 'default' },
    { id: 'e3', source: 'codex-1', target: 'condition-1', type: 'default' },
    { id: 'e4', source: 'condition-1', target: 'claude-1', label: '是', type: 'default' },
    { id: 'e5', source: 'condition-1', target: 'trae-1', label: '否', type: 'default' },
    { id: 'e6', source: 'claude-1', target: 'memory-1', type: 'default' },
    { id: 'e7', source: 'trae-1', target: 'memory-1', type: 'default' },
    { id: 'e8', source: 'memory-1', target: 'output-1', type: 'default' },
    { id: 'e9', source: 'output-1', target: 'end-1', type: 'default' },
  ],
}

export const EXAMPLE_WORKFLOWS: WorkflowDefinition[] = [
  CODE_REVIEW_WORKFLOW,
  RESEARCH_WORKFLOW,
  DATA_PIPELINE_WORKFLOW,
]

// Sample execution logs
export const SAMPLE_LOGS: LogEntry[] = [
  { id: '1', timestamp: '14:32:01', nodeId: 'start-1', nodeName: '开始', level: 'info', message: '工作流 "自动化代码审查" 启动' },
  { id: '2', timestamp: '14:32:02', nodeId: 'claude-1', nodeName: 'Claude: 读取 PR', level: 'info', message: 'Agent Claude 开始执行任务: 读取并分析 PR 描述' },
  { id: '3', timestamp: '14:32:05', nodeId: 'claude-1', nodeName: 'Claude: 读取 PR', level: 'info', message: 'PR 分析完成，提取到 12 个变更文件，包含 3 个测试文件' },
  { id: '4', timestamp: '14:32:06', nodeId: 'condition-1', nodeName: '有测试文件？', level: 'info', message: '条件判断: has_test_files = true，走 "是" 分支' },
  { id: '5', timestamp: '14:32:07', nodeId: 'codex-1', nodeName: 'Codex: 审查测试', level: 'info', message: 'Agent Codex 开始审查测试代码' },
  { id: '6', timestamp: '14:32:15', nodeId: 'codex-1', nodeName: 'Codex: 审查测试', level: 'info', message: '测试代码审查完成: 覆盖率 87%，发现 2 个潜在问题' },
  { id: '7', timestamp: '14:32:16', nodeId: 'parallel-1', nodeName: '并行审查', level: 'info', message: '并行分支启动，分发到 2 个执行路径' },
  { id: '8', timestamp: '14:32:17', nodeId: 'claude-2', nodeName: 'Claude: 审查代码', level: 'info', message: 'Agent Claude 开始代码质量审查' },
  { id: '9', timestamp: '14:32:17', nodeId: 'trae-1', nodeName: 'Trae: 运行测试', level: 'info', message: 'Agent Trae 开始运行测试套件' },
  { id: '10', timestamp: '14:32:18', nodeId: 'trae-1', nodeName: 'Trae: 运行测试', level: 'debug', message: '运行测试: test/unit/auth.test.js ... 通过 (23ms)' },
  { id: '11', timestamp: '14:32:19', nodeId: 'trae-1', nodeName: 'Trae: 运行测试', level: 'debug', message: '运行测试: test/unit/api.test.js ... 通过 (45ms)' },
  { id: '12', timestamp: '14:32:20', nodeId: 'trae-1', nodeName: 'Trae: 运行测试', level: 'warn', message: '运行测试: test/e2e/flow.test.js ... 失败 (120ms)' },
  { id: '13', timestamp: '14:32:21', nodeId: 'trae-1', nodeName: 'Trae: 运行测试', level: 'warn', message: '错误: TimeoutError: Element not found: [data-testid="submit-btn"]' },
  { id: '14', timestamp: '14:32:25', nodeId: 'claude-2', nodeName: 'Claude: 审查代码', level: 'info', message: '代码审查完成: 发现 1 个安全问题，3 个风格建议' },
  { id: '15', timestamp: '14:32:26', nodeId: 'merge-1', nodeName: '合并结果', level: 'info', message: '合并并行审查结果，等待条件判断' },
]
