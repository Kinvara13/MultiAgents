import { memo } from 'react'
import { motion } from 'framer-motion'
import { MoreVertical, Terminal, Cog } from 'lucide-react'
import type { Agent, AgentStatus } from './data'

interface AgentCardProps {
  agent: Agent
  index: number
  onClick: (agent: Agent) => void
}

const statusConfig: Record<AgentStatus, { color: string; label: string; pulse: boolean; borderColor?: string }> = {
  online: { color: '#10B981', label: '在线', pulse: true },
  offline: { color: '#EF4444', label: '离线', pulse: false },
  busy: { color: '#F59E0B', label: '忙碌', pulse: true, borderColor: '#F59E0B' },
}

const typeConfig = {
  local: { bg: 'bg-[rgba(59,130,246,0.15)]', text: 'text-[#3B82F6]', label: '本地' },
  remote: { bg: 'bg-[rgba(139,92,246,0.15)]', text: 'text-[#8B5CF6]', label: '远程' },
}

const taskStatusConfig = {
  queued: { bg: 'bg-[rgba(245,158,11,0.15)]', text: 'text-[#F59E0B]', label: '排队中' },
  running: { bg: 'bg-[rgba(0,212,255,0.15)]', text: 'text-[#00D4FF]', label: '运行中' },
  completed: { bg: 'bg-[rgba(16,185,129,0.15)]', text: 'text-[#10B981]', label: '已完成' },
  failed: { bg: 'bg-[rgba(239,68,68,0.15)]', text: 'text-[#EF4444]', label: '失败' },
  paused: { bg: 'bg-[rgba(100,116,139,0.15)]', text: 'text-[#64748B]', label: '暂停' },
}

function AgentIcon({ name, bg }: { name: string; bg: string }) {
  const renderIcon = () => {
    switch (name) {
      case 'OpenClaw':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3L3 9L9 15" />
            <path d="M15 21L21 15L15 9" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        )
      case 'Hermes':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4L9 12L5 20" />
            <path d="M19 4L15 12L19 20" />
            <path d="M12 2V6" />
            <path d="M12 18V22" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        )
      case 'Claude':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L20 12L12 21L4 12Z" />
            <circle cx="12" cy="12" r="2" fill="white" />
          </svg>
        )
      case 'Codex':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5L3 12L8 19" />
            <path d="M16 5L21 12L16 19" />
            <path d="M10 2L14 22" />
          </svg>
        )
      case 'Trae':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4H20V8H16V20H8V8H4V4Z" />
            <path d="M10 12H14" />
          </svg>
        )
      case 'Cursor':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3L10 12L3 21" />
            <path d="M13 3H21V21H13" />
            <path d="M17 12H17.01" />
          </svg>
        )
      default:
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8V16" />
            <path d="M8 12H16" />
          </svg>
        )
    }
  }

  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      {renderIcon()}
    </div>
  )
}

const AgentCard = memo(function AgentCard({ agent, index, onClick }: AgentCardProps) {
  const status = statusConfig[agent.status]
  const typeStyle = typeConfig[agent.type]
  const isOffline = agent.status === 'offline'

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      }}
      whileHover={{
        y: -3,
        transition: { duration: 0.25 },
      }}
      onClick={() => onClick(agent)}
      className={`bg-[#111827] rounded-xl border p-4 cursor-pointer transition-colors duration-250 relative group ${
        isOffline ? 'opacity-60' : ''
      }`}
      style={{
        borderColor: agent.status === 'busy' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(148, 163, 184, 0.08)',
        borderTopWidth: agent.status === 'busy' ? '2px' : '1px',
      }}
      onMouseEnter={(e) => {
        if (agent.status !== 'busy') {
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'
        }
      }}
      onMouseLeave={(e) => {
        if (agent.status !== 'busy') {
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.08)'
        }
      }}
    >
      {/* Hover glow shadow */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      />

      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <AgentIcon name={agent.name} bg={agent.iconBg} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-h4 text-[#F1F5F9] truncate">{agent.name}</h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: status.color,
                    boxShadow: status.pulse && !isOffline
                      ? `0 0 8px ${status.color}, 0 0 16px ${status.color}80`
                      : 'none',
                  }}
                >
                  {status.pulse && !isOffline && (
                    <span
                      className="absolute w-2.5 h-2.5 rounded-full animate-ping"
                      style={{ backgroundColor: status.color, opacity: 0.5 }}
                    />
                  )}
                </span>
                <span className="text-caption font-mono" style={{ color: status.color }}>
                  {status.label}
                </span>
              </div>
            </div>
            <p className="text-caption text-[#64748B] mt-0.5">{agent.version}</p>
          </div>
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-200 flex-shrink-0"
        >
          <MoreVertical size={16} className="text-[#64748B]" />
        </button>
      </div>

      {/* Info Row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-caption font-medium ${typeStyle.bg} ${typeStyle.text}`}>
          {typeStyle.label}
        </span>
        <span className="text-caption text-[#64748B] font-mono truncate">
          {agent.connection}
        </span>
      </div>

      {/* Capability Tags */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {agent.capabilities.slice(0, 4).map((cap) => (
          <span
            key={cap}
            className="px-2 py-0.5 bg-[#1A2234] text-[#94A3B8] text-[11px] rounded font-medium"
          >
            {cap}
          </span>
        ))}
        {agent.capabilities.length > 4 && (
          <span className="px-2 py-0.5 bg-[#1A2234] text-[#64748B] text-[11px] rounded font-medium">
            +{agent.capabilities.length - 4}
          </span>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-3">
        <div>
          <p className="text-[16px] font-semibold text-[#F1F5F9] leading-tight">{agent.tasksCompleted}</p>
          <p className="text-caption text-[#64748B]">完成任务</p>
        </div>
        <div>
          <p className="text-[16px] font-semibold text-[#10B981] leading-tight">{agent.successRate}%</p>
          <p className="text-caption text-[#64748B]">成功率</p>
        </div>
        <div>
          <p className="text-[16px] font-semibold text-[#94A3B8] leading-tight">{agent.avgDuration}</p>
          <p className="text-caption text-[#64748B]">平均耗时</p>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="space-y-1.5 mb-3">
        {agent.recentTasks.slice(0, 2).map((task) => {
          const tsc = taskStatusConfig[task.status]
          return (
            <div key={task.id} className="flex items-center justify-between">
              <span className="text-body-sm text-[#94A3B8] truncate max-w-[160px]">{task.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${tsc.bg} ${tsc.text}`}>
                {tsc.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[rgba(148,163,184,0.08)]">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-caption text-[#94A3B8] border border-[rgba(148,163,184,0.15)] rounded-md hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9] transition-all duration-200"
          >
            <Cog size={12} />
            配置
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-caption text-[#94A3B8] border border-[rgba(148,163,184,0.15)] rounded-md hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9] transition-all duration-200"
          >
            <Terminal size={12} />
            日志
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isOffline && (
            <span className="text-caption text-[#64748B]">最后在线: {agent.lastActive}</span>
          )}
          <div
            className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors duration-300 ${
              agent.enabled ? 'bg-[#10B981]' : 'bg-[#1A2234]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${
                agent.enabled ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
})

export default AgentCard
