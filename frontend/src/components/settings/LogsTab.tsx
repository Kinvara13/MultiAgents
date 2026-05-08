import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ChevronDown, ChevronUp, RefreshCw, Search, Filter, Radio } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
type LogSource = '系统' | 'OpenClaw' | 'Hermes' | 'Claude' | 'Codex' | 'Trae' | '工作流'

interface LogEntry {
  id: string
  time: string
  level: LogLevel
  source: LogSource
  message: string
  taskId?: string
  details?: string
}

const levelColors: Record<LogLevel, { bg: string; text: string; border: string }> = {
  DEBUG: { bg: 'bg-[#64748B]/15', text: 'text-[#64748B]', border: 'border-l-[#64748B]' },
  INFO: { bg: 'bg-[#00D4FF]/15', text: 'text-[#00D4FF]', border: 'border-l-[#00D4FF]' },
  WARN: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]', border: 'border-l-[#F59E0B]' },
  ERROR: { bg: 'bg-[#EF4444]/15', text: 'text-[#EF4444]', border: 'border-l-[#EF4444]' },
}

const initialLogs: LogEntry[] = [
  { id: '1', time: '2025-01-15 09:23:14', level: 'INFO', source: '系统', message: 'AgentNexus 服务启动完成，版本 v2.0.1', taskId: 'SYS-001' },
  { id: '2', time: '2025-01-15 09:23:18', level: 'INFO', source: 'OpenClaw', message: '远程连接建立成功，节点 ID: oc-7a3f', taskId: 'CONN-102' },
  { id: '3', time: '2025-01-15 09:24:02', level: 'WARN', source: 'Hermes', message: '任务队列堆积，当前深度: 23', taskId: 'QUEUE-015', details: '建议检查下游 Agent 处理能力或增加并发数' },
  { id: '4', time: '2025-01-15 09:24:45', level: 'INFO', source: 'Claude', message: '完成代码审查任务，产出 12 条建议', taskId: 'TASK-3847' },
  { id: '5', time: '2025-01-15 09:25:11', level: 'ERROR', source: 'Codex', message: '连接超时: localhost:8080 无法访问', taskId: 'CONN-103', details: 'java.net.ConnectException: Connection refused\n  at java.net.PlainSocketImpl.socketConnect\n  at java.net.AbstractPlainSocketImpl.doConnect\n  at java.net.AbstractPlainSocketImpl.connectToAddress' },
  { id: '6', time: '2025-01-15 09:25:33', level: 'INFO', source: '工作流', message: '工作流 "daily-sync" 执行完成，耗时 42s', taskId: 'WF-2201' },
  { id: '7', time: '2025-01-15 09:26:01', level: 'INFO', source: 'Trae', message: '接收新任务: 前端组件优化', taskId: 'TASK-3848' },
  { id: '8', time: '2025-01-15 09:26:15', level: 'DEBUG', source: '系统', message: '内存使用率: 42%，CPU: 18%', taskId: 'METRIC-001' },
  { id: '9', time: '2025-01-15 09:27:08', level: 'WARN', source: 'OpenClaw', message: 'API 速率限制接近阈值: 85/100', taskId: 'RATE-003' },
  { id: '10', time: '2025-01-15 09:27:42', level: 'INFO', source: 'Hermes', message: '队列深度恢复正常: 12', taskId: 'QUEUE-016' },
  { id: '11', time: '2025-01-15 09:28:19', level: 'ERROR', source: 'Claude', message: '任务执行异常: 上下文长度超限', taskId: 'TASK-3849', details: 'ContextLengthExceeded: prompt tokens 89234 > max 80000\n  at anthropic.api.message_create\n  at agentnexus.executor.run_task' },
  { id: '12', time: '2025-01-15 09:29:05', level: 'INFO', source: '系统', message: '自动备份完成: backup-20250115-0928.tar.gz', taskId: 'BACKUP-001' },
]

const extraLogMessages: { message: string; source: LogSource; level: LogLevel; taskId: string }[] = [
  { message: '新 Agent 注册: Codex@localhost:8081', source: '系统', level: 'INFO', taskId: 'REG-101' },
  { message: '任务完成: 数据库迁移脚本生成', source: 'Codex', level: 'INFO', taskId: 'TASK-3850' },
  { message: 'WebSocket 心跳检测正常', source: '系统', level: 'DEBUG', taskId: 'HEART-015' },
  { message: 'Token 使用量告警: 当前小时 45000 / 50000', source: 'OpenClaw', level: 'WARN', taskId: 'BILL-003' },
  { message: '产物文件上传成功: schema.sql (12KB)', source: '工作流', level: 'INFO', taskId: 'WF-2202' },
]

function LevelBadge({ level }: { level: LogLevel }) {
  const c = levelColors[level]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {level}
    </span>
  )
}

function LogRow({ log, expanded, onToggle }: { log: LogEntry; expanded: boolean; onToggle: () => void }) {
  const isError = log.level === 'ERROR'
  return (
    <motion.div
      variants={itemVariants}
      layout
      className={`border-b border-[rgba(148,163,184,0.08)] ${isError ? 'border-l-2 border-l-[#EF4444]' : ''}`}
    >
      <div
        onClick={onToggle}
        className="grid grid-cols-[140px_80px_120px_1fr_100px_40px] gap-3 px-5 items-center cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
        style={{ height: 40 }}
      >
        <span className="text-xs font-mono text-[#64748B] truncate">{log.time}</span>
        <LevelBadge level={log.level} />
        <span className="text-xs text-[#94A3B8] truncate">{log.source}</span>
        <span className="text-xs text-[#F1F5F9] truncate">{log.message}</span>
        <span className="text-xs font-mono text-[#00D4FF] truncate">{log.taskId}</span>
        <div className="flex justify-center">
          {expanded ? <ChevronUp size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />}
        </div>
      </div>
      <AnimatePresence>
        {expanded && log.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-3 bg-[#0D1117] border-t border-[rgba(148,163,184,0.06)]">
              <p className="text-xs text-[#64748B] mb-1">详细信息</p>
              <pre className="text-xs font-mono text-[#94A3B8] whitespace-pre-wrap leading-relaxed">{log.details}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [liveTail, setLiveTail] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel[]>(['INFO', 'WARN', 'ERROR'])
  const [sourceFilter, setSourceFilter] = useState<LogSource[]>(['系统', 'OpenClaw', 'Hermes', 'Claude', 'Codex', 'Trae', '工作流'])
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const toggleLevel = useCallback((level: LogLevel) => {
    setLevelFilter(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level])
  }, [])

  const toggleSource = useCallback((source: LogSource) => {
    setSourceFilter(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source])
  }, [])

  const filteredLogs = logs.filter(log => {
    if (!levelFilter.includes(log.level)) return false
    if (!sourceFilter.includes(log.source)) return false
    if (search && !log.message.toLowerCase().includes(search.toLowerCase()) && !log.taskId?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Live tail simulation
  useEffect(() => {
    if (liveTail) {
      intervalRef.current = setInterval(() => {
        const extra = extraLogMessages[Math.floor(Math.random() * extraLogMessages.length)]
        const now = new Date()
        const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        const newLog: LogEntry = {
          id: `live-${Date.now()}`,
          time,
          level: extra.level,
          source: extra.source,
          message: extra.message,
          taskId: extra.taskId,
        }
        setLogs(prev => [newLog, ...prev].slice(0, 200))
      }, 3000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [liveTail])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Filter Bar */}
      <motion.div variants={itemVariants} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-4 mb-4 space-y-4">
        {/* Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input
              placeholder="搜索日志内容或任务 ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#151D2C] border border-[rgba(148,163,184,0.08)]">
              <Radio size={14} className={liveTail ? 'text-[#EF4444]' : 'text-[#64748B]'} />
              <span className="text-xs text-[#94A3B8]">实时</span>
              <Switch
                checked={liveTail}
                onCheckedChange={setLiveTail}
                className="data-[state=checked]:bg-[#EF4444]"
              />
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg border border-[rgba(148,163,184,0.15)] text-[#64748B] hover:text-[#F1F5F9] hover:border-[rgba(0,212,255,0.3)] transition-all duration-200"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-[#64748B]" />
          <span className="text-xs text-[#64748B] mr-1">级别:</span>
          {(['DEBUG', 'INFO', 'WARN', 'ERROR'] as LogLevel[]).map(level => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                levelFilter.includes(level)
                  ? `${levelColors[level].bg} ${levelColors[level].text}`
                  : 'bg-[#151D2C] text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#64748B] mr-1">来源:</span>
          {(['系统', 'OpenClaw', 'Hermes', 'Claude', 'Codex', 'Trae', '工作流'] as LogSource[]).map(source => (
            <button
              key={source}
              onClick={() => toggleSource(source)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all duration-200 ${
                sourceFilter.includes(source)
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'bg-[#151D2C] text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {source}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Log Table */}
      <motion.div variants={itemVariants} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] overflow-hidden relative">
        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-20">
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent animate-scan-line" />
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[140px_80px_120px_1fr_100px_40px] gap-3 px-5 py-3 text-xs text-[#64748B] font-medium uppercase tracking-wider border-b border-[rgba(148,163,184,0.08)] bg-[#111827]">
          <span>时间</span>
          <span>级别</span>
          <span>来源</span>
          <span>事件</span>
          <span>关联</span>
          <span></span>
        </div>

        {/* Table Body */}
        <div className="max-h-[600px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filteredLogs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))}
          </AnimatePresence>
          {filteredLogs.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-[#64748B]">没有匹配条件的日志</p>
            </div>
          )}
        </div>

        {/* Table Footer */}
        <div className="px-5 py-2 border-t border-[rgba(148,163,184,0.08)] flex items-center justify-between">
          <span className="text-xs text-[#64748B]">
            共 {filteredLogs.length} 条日志
            {liveTail && <span className="ml-2 text-[#EF4444] animate-pulse">● 实时接收中</span>}
          </span>
          <span className="text-xs text-[#64748B]">最新 200 条</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
