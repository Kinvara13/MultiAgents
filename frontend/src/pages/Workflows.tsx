import { useState, useCallback, useRef, useMemo } from 'react'
import { ReactFlowProvider, type ReactFlowInstance, type Node, type Edge } from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, AlertCircle, GitBranch, Sparkles, Database, ArrowRight } from 'lucide-react'
import type { WorkflowDefinition as LocalWorkflowDefinition, WorkflowNodeData, LogEntry } from '@/components/workflows/types'
import { EXAMPLE_WORKFLOWS, SAMPLE_LOGS } from '@/components/workflows/types'
import type { WorkflowDefinition as ApiWorkflowDefinition } from '@/api/types'
import { useWorkflows, useWorkflowMutations } from '@/hooks/useApi'
import NodePalette from '@/components/workflows/NodePalette'
import PropertiesPanel from '@/components/workflows/PropertiesPanel'
import ConsolePanel from '@/components/workflows/ConsolePanel'
import Toolbar from '@/components/workflows/Toolbar'
import FlowCanvas from '@/components/workflows/FlowCanvas'

// ─── API → Local format transformer ───────────────────────────────────

function transformApiWorkflowToLocal(apiWf: ApiWorkflowDefinition): LocalWorkflowDefinition {
  return {
    id: apiWf.id,
    name: apiWf.name,
    description: apiWf.description ?? '',
    nodes: apiWf.definition.nodes.map((n) => ({
      id: n.id,
      type: n.type as LocalWorkflowDefinition['nodes'][0]['type'],
      position: n.position,
      data: n.data as unknown as WorkflowNodeData,
    })),
    edges: apiWf.definition.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.type,
    })),
  }
}

// ─── Loading Spinner ──────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0A0E17]">
      <Loader2 size={40} className="text-[#00D4FF] animate-spin mb-4" />
      <p className="text-[14px] text-[#64748B]">加载工作流数据...</p>
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg m-4"
    >
      <AlertCircle size={18} className="text-[#EF4444] shrink-0" />
      <div className="flex-1">
        <p className="text-[13px] text-[#EF4444]">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-[12px] text-[#00D4FF] hover:text-[#F1F5F9] transition-colors"
        >
          重试
        </button>
      )}
    </motion.div>
  )
}

// ─── Template Selector Wrapper with API data ──────────────────────────

const FALLBACK_TEMPLATES = [
  { id: 'code-review', name: '自动化代码审查', description: '多 Agent 协同的 PR 代码审查流程：读取 PR、条件分支、并行审查、产物收集', icon: GitBranch, color: '#00D4FF' },
  { id: 'research', name: '多 Agent 研究分析', description: '多个 Agent 并行进行信息收集、分析和综合报告生成', icon: Sparkles, color: '#8B5CF6' },
  { id: 'data-pipeline', name: '数据处理管道', description: 'ETL 数据流水线：清洗、验证、转换、存储全流程', icon: Database, color: '#10B981' },
]

interface ApiTemplateSelectorProps {
  apiWorkflows: ApiWorkflowDefinition[]
  onSelect: (workflow: LocalWorkflowDefinition) => void
  onRun?: (id: string) => void
  onValidate?: (id: string) => void
  onDelete?: (id: string) => void
  mutationLoading?: boolean
}

function ApiTemplateSelector({ apiWorkflows, onSelect, onRun, onValidate, onDelete, mutationLoading }: ApiTemplateSelectorProps) {
  // Filter template workflows from API
  const templates = useMemo(() => {
    const templateWorkflows = apiWorkflows.filter((w) => w.is_template)
    if (templateWorkflows.length === 0) return []
    return templateWorkflows.map((wf) => ({
      apiWf: wf,
      localWf: transformApiWorkflowToLocal(wf),
    }))
  }, [apiWorkflows])

  // Use fallback display metadata when no API templates
  const displayItems = templates.length > 0
    ? templates.map((t, i) => {
        const fallback = FALLBACK_TEMPLATES[i % FALLBACK_TEMPLATES.length]
        return {
          id: t.apiWf.id,
          name: t.apiWf.name,
          description: t.apiWf.description ?? fallback.description,
          icon: fallback.icon,
          color: fallback.color,
          localWf: t.localWf,
          apiWf: t.apiWf,
        }
      })
    : FALLBACK_TEMPLATES.map((t, i) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        color: t.color,
        localWf: EXAMPLE_WORKFLOWS[i],
        apiWf: null,
      }))

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[800px] px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.15)] flex items-center justify-center mx-auto mb-4">
            <GitBranch size={28} className="text-[#00D4FF]" />
          </div>
          <h3 className="text-h3 text-[#F1F5F9] mb-2">
            {templates.length > 0 ? '从已有模板开始' : '拖拽左侧节点到此处开始'}
          </h3>
          <p className="text-body text-[#64748B]">
            {templates.length > 0 ? '选择一个工作流模板快速开始' : '或选择一个模板快速开始'}
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-4">
          {displayItems.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + i * 0.1,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                }}
                className="
                  bg-[#111827] border border-[rgba(148,163,184,0.08)] rounded-xl p-5
                  hover:border-[rgba(0,212,255,0.3)] hover:translate-y-[-2px]
                  hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]
                  transition-all duration-250 text-left
                "
              >
                <button
                  onClick={() => onSelect(item.localWf)}
                  className="w-full text-left"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <Icon size={20} style={{ color: item.color }} />
                  </div>
                  <h4 className="text-[14px] font-medium text-[#F1F5F9] mb-1.5">{item.name}</h4>
                  <p className="text-[12px] text-[#64748B] leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-[11px] text-[#00D4FF]">
                    <span>使用模板</span>
                    <ArrowRight size={12} />
                  </div>
                </button>

                {/* Action buttons for API workflows */}
                {item.apiWf && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(148,163,184,0.08)]">
                    <button
                      onClick={(e) => { e.stopPropagation(); onRun?.(item.apiWf!.id) }}
                      disabled={mutationLoading}
                      className="flex-1 text-[11px] px-2 py-1.5 rounded-md bg-[rgba(16,185,129,0.1)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)] transition-colors disabled:opacity-50"
                    >
                      运行
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onValidate?.(item.apiWf!.id) }}
                      disabled={mutationLoading}
                      className="flex-1 text-[11px] px-2 py-1.5 rounded-md bg-[rgba(0,212,255,0.1)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.2)] transition-colors disabled:opacity-50"
                    >
                      验证
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete?.(item.apiWf!.id) }}
                      disabled={mutationLoading}
                      className="flex-1 text-[11px] px-2 py-1.5 rounded-md bg-[rgba(239,68,68,0.1)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Workflow List Sidebar ────────────────────────────────────────────

function WorkflowListSidebar({
  workflows,
  selectedId,
  onSelect,
  onRun,
  onValidate,
  onDelete,
  mutationLoading,
}: {
  workflows: LocalWorkflowDefinition[]
  selectedId: string | null
  onSelect: (wf: LocalWorkflowDefinition) => void
  onRun: (id: string) => void
  onValidate: (id: string) => void
  onDelete: (id: string) => void
  mutationLoading: boolean
}) {
  if (workflows.length === 0) return null

  return (
    <div className="w-[260px] bg-[#0D1117] border-r border-[rgba(148,163,184,0.08)] flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-[rgba(148,163,184,0.08)]">
        <h3 className="text-[13px] font-medium text-[#F1F5F9]">工作流列表</h3>
        <p className="text-[11px] text-[#64748B] mt-0.5">共 {workflows.length} 个工作流</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            onClick={() => onSelect(wf)}
            className={`
              px-4 py-3 border-b border-[rgba(148,163,184,0.05)] cursor-pointer
              transition-colors duration-150
              ${selectedId === wf.id ? 'bg-[rgba(0,212,255,0.06)]' : 'hover:bg-[rgba(148,163,184,0.04)]'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${selectedId === wf.id ? 'bg-[#00D4FF]' : 'bg-[#64748B]'}`} />
              <span className={`text-[12px] font-medium truncate ${selectedId === wf.id ? 'text-[#00D4FF]' : 'text-[#F1F5F9]'}`}>
                {wf.name}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] truncate ml-4">{wf.description || '无描述'}</p>
            <div className="flex items-center gap-1.5 mt-2 ml-4">
              <button
                onClick={(e) => { e.stopPropagation(); onRun(wf.id) }}
                disabled={mutationLoading}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)] transition-colors disabled:opacity-50"
              >
                运行
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onValidate(wf.id) }}
                disabled={mutationLoading}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.1)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.2)] transition-colors disabled:opacity-50"
              >
                验证
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(wf.id) }}
                disabled={mutationLoading}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors disabled:opacity-50"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Workflow Builder ────────────────────────────────────────────

function WorkflowBuilder() {
  // API hooks
  const workflows = useWorkflows()
  const mutations = useWorkflowMutations()

  // Transform API workflows to local format
  const allWorkflows: LocalWorkflowDefinition[] = useMemo(() => {
    const items = workflows.data?.items ?? []
    if (items.length === 0) return EXAMPLE_WORKFLOWS
    return items.map(transformApiWorkflowToLocal)
  }, [workflows.data])

  // Workflow state
  const [workflow, setWorkflow] = useState<LocalWorkflowDefinition>(allWorkflows[0] ?? EXAMPLE_WORKFLOWS[0])
  const [workflowName, setWorkflowName] = useState(allWorkflows[0]?.name ?? EXAMPLE_WORKFLOWS[0].name)
  const [workflowDescription, setWorkflowDescription] = useState(allWorkflows[0]?.description ?? EXAMPLE_WORKFLOWS[0].description)
  const [hasChanges, setHasChanges] = useState(false)

  // UI state
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [selectedNode, setSelectedNode] = useState<WorkflowNodeData | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showWorkflowList, setShowWorkflowList] = useState(false)

  // Execution state
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([...SAMPLE_LOGS])
  const [zoom, setZoom] = useState(1)

  // React Flow instance
  const flowRef = useRef<ReactFlowInstance | null>(null)

  // Update selected workflow when API data loads
  const [initialLoaded, setInitialLoaded] = useState(false)
  if (workflows.data && !initialLoaded && allWorkflows.length > 0) {
    setInitialLoaded(true)
    setWorkflow(allWorkflows[0])
    setWorkflowName(allWorkflows[0].name)
    setWorkflowDescription(allWorkflows[0].description)
  }

  // ─── Mutation handlers ──────────────────────────────────────────────

  const handleRunWorkflow = useCallback(async (id: string) => {
    try {
      const result = await mutations.run(id)
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level: 'info',
          message: `工作流运行已触发: ${result.run_id} - ${result.message}`,
        },
      ])
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level: 'error',
          message: `运行失败: ${mutations.error ?? String(err)}`,
        },
      ])
    }
  }, [mutations])

  const handleValidateWorkflow = useCallback(async (id: string) => {
    try {
      const result = await mutations.validate(id)
      const level = result.valid ? 'info' : 'error'
      const msg = result.valid
        ? `验证通过: ${result.node_count} 个节点, ${result.edge_count} 条边`
        : `验证失败: ${result.errors.join(', ')}`
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level,
          message: msg,
        },
      ])
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level: 'error',
          message: `验证失败: ${mutations.error ?? String(err)}`,
        },
      ])
    }
  }, [mutations])

  const handleDeleteWorkflow = useCallback(async (id: string) => {
    if (!window.confirm('确定要删除这个工作流吗？')) return
    try {
      await mutations.remove(id)
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level: 'info',
          message: '工作流已删除',
        },
      ])
      // Refresh workflows list
      workflows.setLoading(true)
      setTimeout(() => workflows.setLoading(false), 100)
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level: 'error',
          message: `删除失败: ${mutations.error ?? String(err)}`,
        },
      ])
    }
  }, [mutations, workflows])

  // Handle workflow selection
  const handleSelectWorkflow = useCallback((wf: LocalWorkflowDefinition) => {
    setWorkflow(wf)
    setWorkflowName(wf.name)
    setWorkflowDescription(wf.description)
    setSelectedNode(null)
    setShowTemplateSelector(false)
    setHasChanges(true)
    setLogs([])
  }, [])

  // Handle node selection
  const handleNodeSelect = useCallback((nodeData: WorkflowNodeData | null) => {
    setSelectedNode(nodeData)
  }, [])

  // Handle node click from logs
  const handleLogNodeClick = useCallback((nodeId: string) => {
    if (flowRef.current) {
      const node = workflow.nodes.find((n) => n.id === nodeId)
      if (node) {
        flowRef.current.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 500 })
        setSelectedNode(node.data)
      }
    }
  }, [workflow.nodes])

  // Handle nodes change
  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setWorkflow((prev) => ({
      ...prev,
      nodes: newNodes.map((n) => ({
        id: n.id,
        type: (n.data as unknown as WorkflowNodeData).type,
        position: n.position,
        data: n.data as unknown as WorkflowNodeData,
      })),
    }))
    setHasChanges(true)
  }, [])

  // Handle edges change
  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setWorkflow((prev) => ({
      ...prev,
      edges: newEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
        type: e.type || undefined,
      })),
    }))
    setHasChanges(true)
  }, [])

  // ─── Toolbar action handlers ────────────────────────────────────────

  // Run current workflow
  const handleRun = useCallback(() => {
    // Try to run via API if the current workflow came from API
    const apiItems = workflows.data?.items ?? []
    const apiWf = apiItems.find((w) => w.id === workflow.id)
    if (apiWf) {
      handleRunWorkflow(workflow.id)
    }

    if (isPaused) {
      setIsPaused(false)
      setIsRunning(true)
      return
    }
    setIsRunning(true)
    setIsPaused(false)
    setLogs([{
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      level: 'info',
      message: `工作流 "${workflowName}" 开始执行`,
    }])

    // Simulate execution logs
    const simulationLogs: LogEntry[] = [
      { id: 's1', timestamp: '14:33:01', nodeId: 'start-1', nodeName: '开始', level: 'info', message: '工作流初始化完成' },
      { id: 's2', timestamp: '14:33:02', nodeId: 'claude-1', nodeName: 'Claude: 读取 PR', level: 'info', message: 'Agent 连接成功，开始分析 PR 描述' },
      { id: 's3', timestamp: '14:33:05', nodeId: 'claude-1', nodeName: 'Claude: 读取 PR', level: 'debug', message: '提取到 12 个变更文件，3 个测试文件' },
      { id: 's4', timestamp: '14:33:06', nodeId: 'condition-1', nodeName: '有测试文件？', level: 'info', message: '条件判断: has_test_files = true，走 "是" 分支' },
      { id: 's5', timestamp: '14:33:07', nodeId: 'codex-1', nodeName: 'Codex: 审查测试', level: 'info', message: '开始审查测试代码覆盖率' },
    ]

    let logIndex = 0
    const interval = setInterval(() => {
      if (logIndex < simulationLogs.length) {
        setLogs((prev) => [...prev, simulationLogs[logIndex]])
        logIndex++
      } else {
        clearInterval(interval)
        setLogs((prev) => [
          ...prev,
          {
            id: 's-done',
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            level: 'info',
            message: '工作流执行完成',
          },
        ])
        setIsRunning(false)
      }
    }, 800)
  }, [isPaused, workflowName, workflow.id, workflows.data, handleRunWorkflow])

  const handleDebug = useCallback(() => {
    setIsRunning(true)
    setIsPaused(false)
    setLogs([{
      id: 'd1',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      level: 'debug',
      message: '调试模式启动 - 断点已设置在条件节点',
    }])
  }, [])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    setLogs((prev) => [
      ...prev,
      {
        id: 'pause',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        level: 'warn',
        message: '工作流已暂停',
      },
    ])
  }, [])

  const handleStop = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    setLogs((prev) => [
      ...prev,
      {
        id: 'stop',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        level: 'error',
        message: '工作流被用户终止',
      },
    ])
  }, [])

  const handleSave = useCallback(() => {
    setHasChanges(false)
    setLogs((prev) => [
      ...prev,
      {
        id: 'save',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        level: 'info',
        message: '工作流已保存',
      },
    ])
  }, [])

  const handleUndo = useCallback(() => {
    setLogs((prev) => [
      ...prev,
      {
        id: 'undo',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        level: 'debug',
        message: '撤销操作',
      },
    ])
  }, [])

  const handleRedo = useCallback(() => {
    setLogs((prev) => [
      ...prev,
      {
        id: 'redo',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        level: 'debug',
        message: '重做操作',
      },
    ])
  }, [])

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(workflow, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${workflowName}.json`
    link.click()
    URL.revokeObjectURL(url)
    setLogs((prev) => [
      ...prev,
      {
        id: 'export',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        level: 'info',
        message: `工作流已导出: ${workflowName}.json`,
      },
    ])
  }, [workflow, workflowName])

  const handleZoomIn = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.zoomIn()
      setZoom(flowRef.current.getZoom())
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.zoomOut()
      setZoom(flowRef.current.getZoom())
    }
  }, [])

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    flowRef.current = instance
  }, [])

  // Loading state
  if (workflows.loading && !workflows.data) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0E17] overflow-hidden">
      {/* Error banner */}
      <AnimatePresence>
        {workflows.error && (
          <ErrorBanner message={workflows.error} />
        )}
        {mutations.error && (
          <ErrorBanner message={mutations.error} />
        )}
      </AnimatePresence>

      {/* Top Toolbar */}
      <Toolbar
        workflowName={workflowName}
        onWorkflowNameChange={(name) => {
          setWorkflowName(name)
          setHasChanges(true)
        }}
        isRunning={isRunning}
        isPaused={isPaused}
        hasChanges={hasChanges}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRun={handleRun}
        onDebug={handleDebug}
        onPause={handlePause}
        onStop={handleStop}
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node Palette + Workflow List toggle */}
        <div className="flex">
          {showWorkflowList ? (
            <WorkflowListSidebar
              workflows={allWorkflows}
              selectedId={workflow.id}
              onSelect={handleSelectWorkflow}
              onRun={handleRunWorkflow}
              onValidate={handleValidateWorkflow}
              onDelete={handleDeleteWorkflow}
              mutationLoading={mutations.loading}
            />
          ) : (
            <NodePalette
              collapsed={paletteCollapsed}
              onToggle={() => setPaletteCollapsed(!paletteCollapsed)}
            />
          )}

          {/* Toggle between palette and workflow list */}
          <button
            onClick={() => setShowWorkflowList(!showWorkflowList)}
            className="w-[28px] bg-[#0D1117] border-r border-[rgba(148,163,184,0.08)] flex items-center justify-center hover:bg-[rgba(0,212,255,0.06)] transition-colors"
            title={showWorkflowList ? '显示节点面板' : '显示工作流列表'}
          >
            <ArrowRight
              size={14}
              className={`text-[#64748B] transition-transform duration-200 ${showWorkflowList ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Loading overlay */}
          <AnimatePresence>
            {workflows.loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-20 bg-[rgba(10,14,23,0.7)]"
              >
                <div className="flex flex-col items-center">
                  <Loader2 size={32} className="text-[#00D4FF] animate-spin mb-3" />
                  <p className="text-[13px] text-[#94A3B8]">刷新中...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Template selector overlay */}
          <AnimatePresence>
            {showTemplateSelector && (
              <ApiTemplateSelector
                apiWorkflows={workflows.data?.items ?? []}
                onSelect={handleSelectWorkflow}
                onRun={handleRunWorkflow}
                onValidate={handleValidateWorkflow}
                onDelete={handleDeleteWorkflow}
                mutationLoading={mutations.loading}
              />
            )}
          </AnimatePresence>

          {/* Flow Canvas */}
          <FlowCanvas
            workflow={workflow}
            onNodeSelect={handleNodeSelect}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onInit={handleInit}
          />

          {/* Bottom Console */}
          <ConsolePanel
            logs={logs}
            isRunning={isRunning}
            onNodeClick={handleLogNodeClick}
          />
        </div>

        {/* Right Properties Panel */}
        <AnimatePresence>
          {selectedNode !== null && (
            <PropertiesPanel
              selectedNode={selectedNode}
              workflowName={workflowName}
              workflowDescription={workflowDescription}
              onWorkflowNameChange={setWorkflowName}
              onWorkflowDescriptionChange={setWorkflowDescription}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function Workflows() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder />
    </ReactFlowProvider>
  )
}
