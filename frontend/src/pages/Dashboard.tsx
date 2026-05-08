import { LayoutDashboard, Activity, Bot, GitBranch, Package, Terminal, AlertCircle } from 'lucide-react'
import { useAgents, useSystemMetrics, useWorkflowStats, useWorkflowRuns } from '@/hooks/useApi'
import type { AgentResponse } from '@/api/types'

export default function Dashboard() {
  const agents = useAgents()
  const systemMetrics = useSystemMetrics()
  const workflowStats = useWorkflowStats()
  const workflowRuns = useWorkflowRuns(null)

  const onlineCount = agents.data?.items?.filter((a: AgentResponse) => a.status === 'online').length ?? 0
  const totalCount = agents.data?.total ?? 0
  const activeTasks = agents.data?.items
    ?.filter((a: AgentResponse) => a.status === 'online')
    ?.reduce((sum: number, a: AgentResponse) => sum + a.total_tasks, 0) ?? 0
  const runningWorkflows = workflowStats.data?.runs_by_status?.['running'] || 0
  const todayArtifacts = 28

  const isLoading = agents.loading || systemMetrics.loading || workflowStats.loading

  const stats = [
    { label: '活跃任务', value: String(activeTasks), icon: Activity, color: '#00D4FF', bg: 'rgba(0,212,255,0.06)' },
    { label: '在线 Agent', value: `${onlineCount} / ${totalCount}`, icon: Bot, color: '#10B981', bg: 'rgba(16,185,129,0.06)' },
    { label: '今日产物', value: String(todayArtifacts), icon: Package, color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)' },
    { label: '运行中工作流', value: String(runningWorkflows), icon: GitBranch, color: '#F59E0B', bg: 'rgba(245,158,11,0.06)' },
  ]

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-[#10B981] animate-pulse-green'
      case 'busy': return 'bg-[#F59E0B]'
      case 'error': return 'bg-[#EF4444]'
      default: return 'bg-[#64748B]'
    }
  }

  const getAgentTypeLabel = (type: string) => type === 'local' ? '本地' : '远程'

  const getAgentTypeStyle = (type: string) =>
    type === 'local'
      ? 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]'
      : 'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]'

  const getRunStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-[#00D4FF] animate-pulse'
      case 'completed': return 'bg-[#10B981]'
      case 'failed': return 'bg-[#EF4444]'
      default: return 'bg-[#F59E0B]'
    }
  }

  const getRunStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return { cls: 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF]', label: '运行中' }
      case 'completed': return { cls: 'bg-[rgba(16,185,129,0.1)] text-[#10B981]', label: '已完成' }
      case 'failed': return { cls: 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]', label: '失败' }
      default: return { cls: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]', label: '排队中' }
    }
  }

  const memoryUsed = systemMetrics.data?.memory_used_mb
    ? `${(systemMetrics.data.memory_used_mb / 1024).toFixed(1)} GB`
    : '--'

  const metrics = [
    { label: 'CPU 使用率', value: systemMetrics.data?.cpu_percent != null ? `${systemMetrics.data.cpu_percent}%` : '--', color: '#00D4FF' },
    { label: '内存使用', value: memoryUsed, color: '#8B5CF6' },
    { label: '磁盘使用', value: systemMetrics.data?.disk_usage_percent != null ? `${systemMetrics.data.disk_usage_percent}%` : '--', color: '#10B981' },
    { label: '负载均衡', value: systemMetrics.data?.load_average?.[0] != null ? `${systemMetrics.data.load_average[0].toFixed(2)}` : '--', color: '#F59E0B' },
  ]

  return (
    <div className="min-h-[100dvh] bg-[#0A0E17] p-6">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-h2 text-[#F1F5F9] mb-1">仪表盘</h1>
            <p className="text-body-sm text-[#64748B]">实时监控所有 Agent 状态与任务队列</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(16,185,129,0.1)] text-[#10B981] text-sm">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse-green" />
              {onlineCount} 在线
            </div>
            {(agents.error || systemMetrics.error || workflowStats.error) && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgba(239,68,68,0.1)] text-[#EF4444] text-sm" title={agents.error || systemMetrics.error || workflowStats.error || undefined}>
                <AlertCircle size={14} />
                数据异常
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <span className="text-sm text-[#94A3B8]">{stat.label}</span>
              </div>
              {isLoading ? (
                <div className="h-8 w-16 bg-[#1E293B] rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-[#F1F5F9]">{stat.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Status */}
          <div className="lg:col-span-2 bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={18} className="text-[#00D4FF]" />
              <h2 className="text-h4 text-[#F1F5F9]">Agent 状态</h2>
            </div>
            {agents.loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#151D2C] border border-[rgba(148,163,184,0.08)]">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#1E293B] animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-20 bg-[#1E293B] rounded animate-pulse" />
                      <div className="h-3 w-32 bg-[#1E293B] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : agents.error ? (
              <div className="text-sm text-[#EF4444] flex items-center gap-2">
                <AlertCircle size={16} />
                无法加载 Agent 数据: {agents.error}
              </div>
            ) : !agents.data?.items?.length ? (
              <div className="text-sm text-[#64748B] text-center py-8">暂无 Agent 数据</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agents.data.items.map((agent: AgentResponse) => (
                  <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#151D2C] border border-[rgba(148,163,184,0.08)]">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getAgentStatusColor(agent.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#F1F5F9]">{agent.name}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${getAgentTypeStyle(agent.type)}`}>
                          {getAgentTypeLabel(agent.type)}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {agent.capabilities?.slice(0, 3).join(', ') || '无能力配置'}
                        {agent.total_tasks > 0 ? ` \u00b7 ${agent.total_tasks} 任务` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Queue */}
          <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <LayoutDashboard size={18} className="text-[#00D4FF]" />
              <h2 className="text-h4 text-[#F1F5F9]">任务队列</h2>
            </div>
            {workflowRuns.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#151D2C]">
                    <div className="w-2 h-2 rounded-full bg-[#1E293B] animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-28 bg-[#1E293B] rounded animate-pulse" />
                      <div className="h-3 w-16 bg-[#1E293B] rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-12 bg-[#1E293B] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : workflowRuns.error ? (
              <div className="text-sm text-[#EF4444] flex items-center gap-2">
                <AlertCircle size={16} />
                无法加载任务数据: {workflowRuns.error}
              </div>
            ) : !workflowRuns.data?.items?.length ? (
              <div className="text-sm text-[#64748B] text-center py-8">暂无运行中的任务</div>
            ) : (
              <div className="space-y-3">
                {workflowRuns.data.items.map((run) => (
                  <div key={run.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#151D2C]">
                    <div className={`w-2 h-2 rounded-full ${getRunStatusColor(run.status)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F1F5F9] truncate">{run.id.slice(0, 8)}</p>
                      <p className="text-xs text-[#64748B]">
                        {run.started_at ? new Date(run.started_at).toLocaleString('zh-CN') : '未开始'}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${getRunStatusBadge(run.status).cls}`}>
                      {getRunStatusBadge(run.status).label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Metrics */}
        <div className="mt-6 bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal size={18} className="text-[#00D4FF]" />
            <h2 className="text-h4 text-[#F1F5F9]">系统指标</h2>
          </div>
          {systemMetrics.loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center p-3">
                  <div className="h-8 w-16 mx-auto mb-1 bg-[#1E293B] rounded animate-pulse" />
                  <div className="h-3 w-20 mx-auto bg-[#1E293B] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : systemMetrics.error ? (
            <div className="text-sm text-[#EF4444] flex items-center gap-2">
              <AlertCircle size={16} />
              无法加载系统指标: {systemMetrics.error}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="text-center p-3">
                  <p className="text-2xl font-bold mb-1" style={{ color: metric.color }}>{metric.value}</p>
                  <p className="text-xs text-[#64748B]">{metric.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
