import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Edit3,
  RotateCcw,
  Trash2,
  LayoutDashboard,
  ClipboardList,
  ScrollText,
  Settings,
  FileCode,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { useState } from 'react'
import type { Agent } from './data'

interface AgentDetailDrawerProps {
  agent: Agent | null
  onClose: () => void
}

const taskStatusConfig = {
  queued: { bg: 'bg-[rgba(245,158,11,0.15)]', text: 'text-[#F59E0B]', label: '排队中' },
  running: { bg: 'bg-[rgba(0,212,255,0.15)]', text: 'text-[#00D4FF]', label: '运行中' },
  completed: { bg: 'bg-[rgba(16,185,129,0.15)]', text: 'text-[#10B981]', label: '已完成' },
  failed: { bg: 'bg-[rgba(239,68,68,0.15)]', text: 'text-[#EF4444]', label: '失败' },
  paused: { bg: 'bg-[rgba(100,116,139,0.15)]', text: 'text-[#64748B]', label: '暂停' },
}

const statusConfig = {
  online: { color: '#10B981', label: '在线' },
  offline: { color: '#EF4444', label: '离线' },
  busy: { color: '#F59E0B', label: '忙碌' },
}

const tabs = [
  { id: 'overview', label: '概览', icon: LayoutDashboard },
  { id: 'tasks', label: '任务历史', icon: ClipboardList },
  { id: 'logs', label: '日志', icon: ScrollText },
  { id: 'config', label: '配置', icon: Settings },
]

function AgentIcon({ name, bg }: { name: string; bg: string }) {
  const renderIcon = () => {
    switch (name) {
      case 'OpenClaw':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3L3 9L9 15" /><path d="M15 21L21 15L15 9" /><circle cx="12" cy="12" r="2" />
          </svg>
        )
      case 'Hermes':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4L9 12L5 20" /><path d="M19 4L15 12L19 20" /><path d="M12 2V6" /><path d="M12 18V22" /><circle cx="12" cy="12" r="2" />
          </svg>
        )
      case 'Claude':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L20 12L12 21L4 12Z" /><circle cx="12" cy="12" r="2" fill="white" />
          </svg>
        )
      case 'Codex':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5L3 12L8 19" /><path d="M16 5L21 12L16 19" /><path d="M10 2L14 22" />
          </svg>
        )
      case 'Trae':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4H20V8H16V20H8V8H4V4Z" /><path d="M10 12H14" />
          </svg>
        )
      case 'Cursor':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3L10 12L3 21" /><path d="M13 3H21V21H13" /><path d="M17 12H17.01" />
          </svg>
        )
      default:
        return <FileCode size={28} color="white" />
    }
  }
  return (
    <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
      {renderIcon()}
    </div>
  )
}

export default function AgentDetailDrawer({ agent, onClose }: AgentDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0A0E17]/60 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-[#111827] border-l border-[rgba(148,163,184,0.08)] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-5 border-b border-[rgba(148,163,184,0.08)]">
              <AgentIcon name={agent.name} bg={agent.iconBg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-h3 text-[#F1F5F9]">{agent.name}</h2>
                  <span
                    className="px-2 py-0.5 rounded text-caption font-medium"
                    style={{
                      backgroundColor: `${statusConfig[agent.status].color}20`,
                      color: statusConfig[agent.status].color,
                    }}
                  >
                    {statusConfig[agent.status].label}
                  </span>
                </div>
                <p className="text-body-sm text-[#94A3B8]">{agent.description}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-200"
                >
                  <X size={18} className="text-[#94A3B8]" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(148,163,184,0.08)]">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption text-[#94A3B8] border border-[rgba(148,163,184,0.15)] rounded-md hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9] transition-all duration-200">
                <Edit3 size={12} />
                编辑配置
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption text-[#94A3B8] border border-[rgba(148,163,184,0.15)] rounded-md hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9] transition-all duration-200">
                <RotateCcw size={12} />
                重启
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption text-[#EF4444] border border-[rgba(239,68,68,0.2)] rounded-md hover:border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200 ml-auto">
                <Trash2 size={12} />
                删除
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 px-5 border-b border-[rgba(148,163,184,0.08)]">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-3 text-sm transition-colors duration-200 ${
                      isActive ? 'text-[#00D4FF]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="drawer-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  {/* Basic Info */}
                  <div className="bg-[#151D2C] rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-[#F1F5F9]">基本信息</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-caption text-[#64748B] mb-0.5">类型</p>
                        <p className="text-body-sm text-[#F1F5F9]">{agent.type === 'local' ? '本地 Agent' : '远程 Agent'}</p>
                      </div>
                      <div>
                        <p className="text-caption text-[#64748B] mb-0.5">版本</p>
                        <p className="text-body-sm text-[#F1F5F9]">{agent.version}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-caption text-[#64748B] mb-0.5">连接地址</p>
                        <p className="text-body-sm text-[#F1F5F9] font-mono">{agent.connection}</p>
                      </div>
                      <div>
                        <p className="text-caption text-[#64748B] mb-0.5">最后心跳</p>
                        <p className="text-body-sm text-[#94A3B8]">{agent.heartbeat || agent.lastActive}</p>
                      </div>
                      <div>
                        <p className="text-caption text-[#64748B] mb-0.5">状态</p>
                        <p className="text-body-sm" style={{ color: statusConfig[agent.status].color }}>
                          {statusConfig[agent.status].label}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="bg-[#151D2C] rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-[#F1F5F9] mb-3">能力矩阵</h4>
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-3 py-1.5 bg-[#1A2234] text-[#94A3B8] text-sm rounded-lg border border-[rgba(148,163,184,0.08)]"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-[#151D2C] rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-[#F1F5F9] mb-3">统计数据</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-[24px] font-bold text-[#F1F5F9]">{agent.tasksCompleted}</p>
                        <p className="text-caption text-[#64748B]">完成任务</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[24px] font-bold text-[#10B981]">{agent.successRate}%</p>
                        <p className="text-caption text-[#64748B]">成功率</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[24px] font-bold text-[#94A3B8]">{agent.avgDuration}</p>
                        <p className="text-caption text-[#64748B]">平均耗时</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'tasks' && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-2"
                >
                  {agent.recentTasks.map((task) => {
                    const tsc = taskStatusConfig[task.status]
                    return (
                      <div
                        key={task.id}
                        className="bg-[#151D2C] rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle size={16} className="text-[#10B981]" />
                          ) : task.status === 'failed' ? (
                            <XCircle size={16} className="text-[#EF4444]" />
                          ) : task.status === 'running' ? (
                            <Clock size={16} className="text-[#00D4FF]" />
                          ) : (
                            <Clock size={16} className="text-[#F59E0B]" />
                          )}
                          <div>
                            <p className="text-body-sm text-[#F1F5F9]">{task.name}</p>
                            <p className="text-caption text-[#64748B]">{task.id} · {task.startTime || ''}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${tsc.bg} ${tsc.text}`}>
                          {tsc.label}
                        </span>
                      </div>
                    )
                  })}
                  {/* Extra mock tasks */}
                  {[
                    { id: 'tk-0408', name: '批量文件处理', status: 'completed' as const, startTime: '昨天 14:20', duration: '5m 10s' },
                    { id: 'tk-0405', name: '依赖安全检查', status: 'completed' as const, startTime: '昨天 10:00', duration: '2m 30s' },
                    { id: 'tk-0402', name: '定时备份任务', status: 'failed' as const, startTime: '前天 22:00', duration: '1m 00s' },
                  ].map((task) => {
                    const tsc = taskStatusConfig[task.status]
                    return (
                      <div
                        key={task.id}
                        className="bg-[#151D2C] rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle size={16} className="text-[#10B981]" />
                          ) : task.status === 'failed' ? (
                            <XCircle size={16} className="text-[#EF4444]" />
                          ) : (
                            <Clock size={16} className="text-[#00D4FF]" />
                          )}
                          <div>
                            <p className="text-body-sm text-[#F1F5F9]">{task.name}</p>
                            <p className="text-caption text-[#64748B]">{task.id} · {task.startTime}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${tsc.bg} ${tsc.text}`}>
                          {tsc.label}
                        </span>
                      </div>
                    )
                  })}
                </motion.div>
              )}

              {activeTab === 'logs' && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="bg-[#0D1117] rounded-xl p-4 font-mono text-[12px] leading-relaxed space-y-1 text-[#94A3B8]">
                    <p><span className="text-[#64748B]">[10:32:15]</span> <span className="text-[#10B981]">INFO</span> Agent heartbeat received — latency 12ms</p>
                    <p><span className="text-[#64748B]">[10:31:42]</span> <span className="text-[#10B981]">INFO</span> Task tk-0422 started: API 健康检查</p>
                    <p><span className="text-[#64748B]">[10:31:01]</span> <span className="text-[#F59E0B]">WARN</span> Connection pool at 75% capacity</p>
                    <p><span className="text-[#64748B]">[10:30:15]</span> <span className="text-[#10B981]">INFO</span> Task tk-0421 completed in 2m 30s</p>
                    <p><span className="text-[#64748B]">[10:30:00]</span> <span className="text-[#10B981]">INFO</span> Scheduled job triggered: daily_sync</p>
                    <p><span className="text-[#64748B]">[10:29:33]</span> <span className="text-[#3B82F6]">DEBUG</span> Cache hit ratio: 0.94</p>
                    <p><span className="text-[#64748B]">[10:28:50]</span> <span className="text-[#10B981]">INFO</span> Memory usage: 128MB / 512MB</p>
                    <p><span className="text-[#64748B]">[10:27:12]</span> <span className="text-[#EF4444]">ERROR</span> Failed to reach cursor.local:5555 — connection refused</p>
                    <p><span className="text-[#64748B]">[10:26:00]</span> <span className="text-[#10B981]">INFO</span> Agent initialized successfully</p>
                    <p><span className="text-[#64748B]">[10:25:45]</span> <span className="text-[#3B82F6]">DEBUG</span> Loading configuration from /etc/agentnexus/config.yaml</p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'config' && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-caption text-[#64748B] mb-1.5">连接地址</label>
                    <input
                      type="text"
                      defaultValue={agent.connection}
                      className="w-full px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-caption text-[#64748B] mb-1.5">API 密钥</label>
                    <input
                      type="password"
                      defaultValue="sk-••••••••••••••••••••••••"
                      className="w-full px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-caption text-[#64748B] mb-1.5">超时设置（秒）</label>
                    <input
                      type="number"
                      defaultValue={30}
                      className="w-full px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-caption text-[#64748B] mb-1.5">环境变量</label>
                    <div className="bg-[#0D1117] rounded-lg p-3 font-mono text-[12px] text-[#94A3B8] space-y-1">
                      <p>AGENT_MAX_CONCURRENT=4</p>
                      <p>AGENT_LOG_LEVEL=info</p>
                      <p>AGENT_ENABLE_METRICS=true</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button className="w-full py-2 bg-[#00D4FF] text-[#0A0E17] rounded-lg text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] transition-all duration-200">
                      保存配置
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
