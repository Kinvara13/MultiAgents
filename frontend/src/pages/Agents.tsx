import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Bot,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { type Agent } from '@/components/agents/data'
import AgentCard from '@/components/agents/AgentCard'
import AgentListView from '@/components/agents/AgentListView'
import AgentDetailDrawer from '@/components/agents/AgentDetailDrawer'
import AddAgentModal from '@/components/agents/AddAgentModal'
import { useAgents, useAgentMutations } from '@/hooks/useApi'
import type { AgentResponse } from '@/api/types'

// ─── Helpers ───────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function mapApiAgentToUi(apiAgent: AgentResponse): Agent {
  const status: Agent['status'] =
    apiAgent.status === 'error' ? 'offline' : apiAgent.status

  return {
    id: apiAgent.id,
    name: apiAgent.name,
    type: apiAgent.type,
    status,
    iconBg: apiAgent.color || '#6366F1',
    capabilities: apiAgent.capabilities,
    connection: apiAgent.endpoint || '-',
    version: '-',
    tasksCompleted: apiAgent.total_tasks,
    successRate: Math.round(apiAgent.success_rate * 100) / 100,
    avgDuration: formatDuration(apiAgent.avg_duration_ms),
    lastActive: apiAgent.last_active_at
      ? new Date(apiAgent.last_active_at).toLocaleString('zh-CN')
      : '从未',
    recentTasks: [],
    enabled: apiAgent.status !== 'offline' && apiAgent.status !== 'error',
    heartbeat: apiAgent.last_active_at
      ? new Date(apiAgent.last_active_at).toLocaleString('zh-CN')
      : '-',
    description: apiAgent.description || '',
  }
}

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // ─── API Hooks ───────────────────────────────────────────────────

  const filterType =
    activeFilter === 'local'
      ? 'local'
      : activeFilter === 'remote'
        ? 'remote'
        : undefined

  const filterStatus =
    activeFilter === 'offline'
      ? 'offline'
      : undefined

  const {
    data: agentsData,
    loading,
    error,
  } = useAgents({
    type: filterType,
    status: filterStatus,
    search: searchQuery.trim() || undefined,
  })

  const {
    create,
    loading: mutating,
    error: mutationError,
  } = useAgentMutations()

  const apiAgents = agentsData?.items || []

  // Map API data to UI Agent type + apply 'online' client-side filter
  const agentList = useMemo(() => {
    let items = apiAgents.map(mapApiAgentToUi)
    if (activeFilter === 'online') {
      items = items.filter((a) => a.status !== 'offline')
    }
    return items
  }, [apiAgents, activeFilter])

  const totalCount = agentsData?.total || 0
  const onlineCount = useMemo(
    () => agentList.filter((a) => a.status !== 'offline').length,
    [agentList]
  )
  const offlineCount = useMemo(
    () => agentList.filter((a) => a.status === 'offline').length,
    [agentList]
  )

  // Build filter tabs with dynamic counts
  const filters = useMemo(
    () => [
      {
        id: 'all',
        label: '全部',
        count: activeFilter === 'all' ? agentList.length : totalCount,
      },
      {
        id: 'local',
        label: '本地',
        count: apiAgents.filter((a) => a.type === 'local').length,
      },
      {
        id: 'remote',
        label: '远程',
        count: apiAgents.filter((a) => a.type === 'remote').length,
      },
      {
        id: 'online',
        label: '在线',
        count: apiAgents.filter(
          (a) => a.status !== 'offline' && a.status !== 'error'
        ).length,
      },
      {
        id: 'offline',
        label: '离线',
        count: apiAgents.filter((a) => a.status === 'offline' || a.status === 'error').length,
      },
    ],
    [agentList.length, totalCount, apiAgents, activeFilter]
  )

  // ─── Handlers ────────────────────────────────────────────────────

  const handleAgentClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setSelectedAgent(null)
  }, [])

  const handleCreateAgent = useCallback(
    async (data: {
      name: string
      slug: string
      type: 'local' | 'remote'
      endpoint: string
      capabilities: string[]
    }) => {
      await create(data)
      setIsAddModalOpen(false)
    },
    [create]
  )

  return (
    <div className="min-h-[100dvh] bg-[#0A0E17]">
      {/* Error Banner */}
      <AnimatePresence>
        {(error || mutationError) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-3 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-xl text-[#EF4444] text-sm max-w-lg"
          >
            <AlertCircle size={16} />
            <span>{error || mutationError}</span>
            <button
              onClick={() => {
                /* hooks will auto-clear on next call */
              }}
              className="ml-2 text-[#EF4444]/70 hover:text-[#EF4444]"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-[#0A0E17]/80 backdrop-blur-[12px] border-b border-[rgba(148,163,184,0.08)]">
        <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
              <Bot size={18} className="text-[#00D4FF]" />
            </div>
            <div>
              <h1 className="text-h4 text-[#F1F5F9] leading-tight">智能体管理</h1>
              <p className="text-caption text-[#64748B]">
                {totalCount} 个 Agent · {onlineCount} 在线 · {offlineCount} 离线
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
                isSearchFocused
                  ? 'border-[rgba(0,212,255,0.3)] bg-[#151D2C] w-[320px]'
                  : 'border-[rgba(148,163,184,0.15)] bg-[#151D2C] w-[280px]'
              }`}
            >
              <Search size={16} className="text-[#64748B] flex-shrink-0" />
              <input
                type="text"
                placeholder="搜索 Agent 名称或能力..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="bg-transparent text-body-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none w-full"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-[rgba(148,163,184,0.15)] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF]'
                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF]'
                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00D4FF] text-[#0A0E17] rounded-lg text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] transition-all duration-200"
            >
              <Plus size={16} />
              添加 Agent
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="max-w-[1440px] mx-auto px-5">
          <div className="flex items-center gap-0">
            {filters.map((filter, index) => (
              <motion.button
                key={filter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + index * 0.05,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                }}
                onClick={() => setActiveFilter(filter.id)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                  activeFilter === filter.id
                    ? filter.id === 'offline'
                      ? 'text-[#EF4444]'
                      : 'text-[#00D4FF]'
                    : filter.id === 'offline'
                      ? 'text-[#EF4444]/60 hover:text-[#EF4444]'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {filter.label}
                <span
                  className={`ml-1.5 text-caption ${
                    activeFilter === filter.id ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  {filter.count}
                </span>
                {activeFilter === filter.id && (
                  <motion.div
                    layoutId="filter-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-5 py-5 relative">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-32 bg-[#0A0E17]/60 backdrop-blur-[2px] rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-[#00D4FF] animate-spin" />
              <p className="text-sm text-[#94A3B8]">加载中...</p>
            </div>
          </div>
        )}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agentList.map((agent, index) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                index={index}
                onClick={handleAgentClick}
              />
            ))}
          </div>
        ) : (
          <AgentListView agents={agentList} onClick={handleAgentClick} />
        )}

        {/* Empty State */}
        {agentList.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#151D2C] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#64748B]" />
            </div>
            <h3 className="text-h4 text-[#F1F5F9] mb-2">未找到匹配的 Agent</h3>
            <p className="text-body text-[#94A3B8]">
              尝试调整搜索关键词或切换过滤条件
            </p>
          </motion.div>
        )}
      </div>

      {/* Detail Drawer */}
      <AgentDetailDrawer agent={selectedAgent} onClose={handleCloseDrawer} />

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateAgent}
        submitting={mutating}
      />
    </div>
  )
}
