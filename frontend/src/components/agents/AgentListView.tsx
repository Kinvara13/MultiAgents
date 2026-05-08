import { memo } from 'react'
import { motion } from 'framer-motion'
import { MoreVertical, Terminal, Cog } from 'lucide-react'
import type { Agent, AgentStatus } from './data'

interface AgentListViewProps {
  agents: Agent[]
  onClick: (agent: Agent) => void
}

const statusConfig: Record<AgentStatus, { color: string; label: string }> = {
  online: { color: '#10B981', label: '在线' },
  offline: { color: '#EF4444', label: '离线' },
  busy: { color: '#F59E0B', label: '忙碌' },
}

const typeConfig = {
  local: { bg: 'bg-[rgba(59,130,246,0.15)]', text: 'text-[#3B82F6]', label: '本地' },
  remote: { bg: 'bg-[rgba(139,92,246,0.15)]', text: 'text-[#8B5CF6]', label: '远程' },
}

const AgentIcon = memo(function AgentIcon({ name, bg }: { name: string; bg: string }) {
  const renderIcon = () => {
    switch (name) {
      case 'OpenClaw':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3L3 9L9 15" /><path d="M15 21L21 15L15 9" /><circle cx="12" cy="12" r="2" />
          </svg>
        )
      case 'Hermes':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4L9 12L5 20" /><path d="M19 4L15 12L19 20" /><path d="M12 2V6" /><path d="M12 18V22" /><circle cx="12" cy="12" r="2" />
          </svg>
        )
      case 'Claude':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L20 12L12 21L4 12Z" /><circle cx="12" cy="12" r="2" fill="white" />
          </svg>
        )
      case 'Codex':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5L3 12L8 19" /><path d="M16 5L21 12L16 19" /><path d="M10 2L14 22" />
          </svg>
        )
      case 'Trae':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4H20V8H16V20H8V8H4V4Z" /><path d="M10 12H14" />
          </svg>
        )
      case 'Cursor':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3L10 12L3 21" /><path d="M13 3H21V21H13" /><path d="M17 12H17.01" />
          </svg>
        )
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8V16" /><path d="M8 12H16" />
          </svg>
        )
    }
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
      {renderIcon()}
    </div>
  )
})

const AgentListView = memo(function AgentListView({ agents, onClick }: AgentListViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] overflow-hidden"
    >
      {/* Table Header */}
      <div className="grid grid-cols-[20%_10%_12%_18%_20%_10%_10%] gap-2 px-4 py-3 border-b border-[rgba(148,163,184,0.08)]">
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] font-medium">名称</span>
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] font-medium">类型</span>
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] font-medium">状态</span>
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] font-medium">连接</span>
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] font-medium">能力</span>
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] font-medium text-right">任务数</span>
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] font-medium text-right">操作</span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-[rgba(148,163,184,0.08)]">
        {agents.map((agent, index) => {
          const status = statusConfig[agent.status]
          const typeStyle = typeConfig[agent.type]
          const isOffline = agent.status === 'offline'

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: isOffline ? 0.6 : 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              onClick={() => onClick(agent)}
              className="grid grid-cols-[20%_10%_12%_18%_20%_10%_10%] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-200"
            >
              {/* Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <AgentIcon name={agent.name} bg={agent.iconBg} />
                <span className="text-body-sm text-[#F1F5F9] truncate font-medium">{agent.name}</span>
              </div>

              {/* Type */}
              <span className={`inline-flex self-center px-2 py-0.5 rounded text-[11px] font-medium w-fit ${typeStyle.bg} ${typeStyle.text}`}>
                {typeStyle.label}
              </span>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                <span className="text-caption font-mono" style={{ color: status.color }}>{status.label}</span>
              </div>

              {/* Connection */}
              <span className="text-caption text-[#64748B] font-mono truncate">{agent.connection}</span>

              {/* Capabilities */}
              <div className="flex items-center gap-1 flex-wrap">
                {agent.capabilities.slice(0, 3).map((cap) => (
                  <span key={cap} className="px-1.5 py-0.5 bg-[#1A2234] text-[#94A3B8] text-[11px] rounded">
                    {cap}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span className="px-1.5 py-0.5 bg-[#1A2234] text-[#64748B] text-[11px] rounded">
                    +{agent.capabilities.length - 3}
                  </span>
                )}
              </div>

              {/* Task Count */}
              <span className="text-body-sm text-[#F1F5F9] text-right font-medium">{agent.tasksCompleted}</span>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <Cog size={14} className="text-[#64748B]" />
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <Terminal size={14} className="text-[#64748B]" />
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <MoreVertical size={14} className="text-[#64748B]" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
})

export default AgentListView
