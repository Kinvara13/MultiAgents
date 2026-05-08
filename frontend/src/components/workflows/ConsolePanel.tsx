import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp,
  ChevronDown,
  Terminal,
  Variable,
  Package,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import type { LogEntry } from './types'

interface ConsolePanelProps {
  logs: LogEntry[]
  isRunning: boolean
  onNodeClick?: (nodeId: string) => void
}

type TabType = 'logs' | 'variables' | 'artifacts' | 'issues'

const tabConfig: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'logs', label: '执行日志', icon: Terminal },
  { id: 'variables', label: '变量', icon: Variable },
  { id: 'artifacts', label: '产物', icon: Package },
  { id: 'issues', label: '问题', icon: AlertTriangle },
]

const levelColors: Record<string, { bg: string; text: string }> = {
  info: { bg: 'bg-[rgba(0,212,255,0.1)]', text: 'text-[#00D4FF]' },
  warn: { bg: 'bg-[rgba(245,158,11,0.1)]', text: 'text-[#F59E0B]' },
  error: { bg: 'bg-[rgba(239,68,68,0.1)]', text: 'text-[#EF4444]' },
  debug: { bg: 'bg-[rgba(100,116,139,0.1)]', text: 'text-[#64748B]' },
}

const levelLabels: Record<string, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERR',
  debug: 'DBG',
}

export default function ConsolePanel({ logs, isRunning, onNodeClick }: ConsolePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('logs')

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  return (
    <div
      className="bg-[#111827] border-t border-[rgba(148,163,184,0.08)] flex-shrink-0 z-20 flex flex-col"
      style={{ height: expanded ? 240 : 40 }}
    >
      {/* Header */}
      <div
        className="h-10 flex items-center justify-between px-4 cursor-pointer select-none"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Terminal size={14} className="text-[#64748B]" />
            <span className="text-[12px] text-[#94A3B8] font-mono">控制台</span>
          </div>
          {isRunning && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
              <span className="text-[11px] text-[#00D4FF]">运行中</span>
            </span>
          )}
          <span className="text-[11px] text-[#64748B]">{logs.length} 条日志</span>
        </div>

        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} className="text-[#94A3B8]" />
          ) : (
            <ChevronUp size={14} className="text-[#94A3B8]" />
          )}
        </div>
      </div>

      {/* Tab bar */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 px-4 border-b border-[rgba(148,163,184,0.08)]"
          >
            {tabConfig.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab(tab.id)
                  }}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-[12px] transition-all duration-150
                    ${isActive ? 'text-[#00D4FF] bg-[rgba(0,212,255,0.06)]' : 'text-[#64748B] hover:text-[#94A3B8]'}
                  `}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            {activeTab === 'logs' && (
              <div className="h-full overflow-y-auto px-4 py-2 space-y-1 font-mono">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[#64748B] text-[12px]">
                    <Clock size={14} className="mr-2" />
                    暂无执行日志
                  </div>
                ) : (
                  logs.map((log, i) => {
                    const colors = levelColors[log.level]
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i < 5 ? i * 0.03 : 0 }}
                        className="flex items-start gap-2 py-1 group"
                      >
                        <span className="text-[11px] text-[#64748B] flex-shrink-0 w-16">
                          {log.timestamp}
                        </span>
                        {log.nodeName && (
                          <button
                            onClick={() => log.nodeId && onNodeClick?.(log.nodeId)}
                            className="
                              text-[11px] text-[#8B5CF6] hover:text-[#00D4FF] hover:underline
                              flex-shrink-0 max-w-[120px] truncate text-left transition-colors
                            "
                          >
                            [{log.nodeName}]
                          </button>
                        )}
                        <span
                          className={`
                            text-[10px] px-1 py-0.5 rounded flex-shrink-0
                            ${colors.bg} ${colors.text}
                          `}
                        >
                          {levelLabels[log.level]}
                        </span>
                        <span className="text-[12px] text-[#94A3B8] flex-1 break-all">
                          {log.message}
                        </span>
                      </motion.div>
                    )
                  })
                )}
              </div>
            )}

            {activeTab === 'variables' && (
              <div className="h-full overflow-y-auto px-4 py-2 font-mono">
                <div className="space-y-1">
                  {[
                    { name: 'pr_url', value: 'https://github.com/org/repo/pull/123', type: 'string' },
                    { name: 'pr_analysis', value: '{ has_tests: true, test_count: 3 }', type: 'object' },
                    { name: 'test_review', value: '{ coverage: 0.87, issues: 2 }', type: 'object' },
                    { name: 'input.topic', value: '"React Server Components"', type: 'string' },
                  ].map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <span className="text-[11px] text-[#8B5CF6]">{v.name}</span>
                      <span className="text-[11px] text-[#64748B]">{v.type}</span>
                      <span className="text-[12px] text-[#94A3B8] flex-1 truncate">{v.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'artifacts' && (
              <div className="h-full overflow-y-auto px-4 py-2">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'review-report.md', size: '12KB', type: 'doc' },
                    { name: 'test-results.json', size: '4KB', type: 'json' },
                    { name: 'coverage.html', size: '156KB', type: 'html' },
                  ].map((a) => (
                    <div
                      key={a.name}
                      className="bg-[#151D2C] rounded-lg p-3 border border-[rgba(148,163,184,0.08)] hover:border-[rgba(0,212,255,0.2)] transition-colors"
                    >
                      <Package size={16} className="text-[#8B5CF6] mb-2" />
                      <p className="text-[12px] text-[#F1F5F9] truncate">{a.name}</p>
                      <p className="text-[11px] text-[#64748B]">{a.size}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'issues' && (
              <div className="h-full overflow-y-auto px-4 py-2 font-mono">
                <div className="space-y-2">
                  {[
                    { level: 'warn' as const, message: 'test/e2e/flow.test.js 超时失败', node: 'Trae: 运行测试' },
                    { level: 'error' as const, message: 'Element not found: [data-testid="submit-btn"]', node: 'Trae: 运行测试' },
                  ].map((issue, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 py-1.5 px-2 rounded bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)]"
                    >
                      <AlertTriangle size={12} className={issue.level === 'error' ? 'text-[#EF4444]' : 'text-[#F59E0B]'} />
                      <div>
                        <p className="text-[12px] text-[#94A3B8]">{issue.message}</p>
                        <p className="text-[11px] text-[#64748B]">节点: {issue.node}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
