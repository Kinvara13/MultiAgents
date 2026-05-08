import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Cpu,
  HardDrive,
  Database,
  Server,
} from 'lucide-react'
import { useSystemMetrics, useAgentMetrics } from '@/hooks/useApi'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

type AlertLevel = 'info' | 'warn' | 'critical'

interface AlertRule {
  id: string
  name: string
  condition: string
  level: AlertLevel
  enabled: boolean
}

const initialAlertRules: AlertRule[] = [
  { id: '1', name: 'Agent 离线', condition: '任意 Agent 离线 > 5min', level: 'warn', enabled: true },
  { id: '2', name: '任务堆积', condition: '队列深度 > 20', level: 'warn', enabled: true },
  { id: '3', name: '高错误率', condition: '错误率 > 5% / 5min', level: 'critical', enabled: true },
  { id: '4', name: '资源不足', condition: 'CPU > 90% / 持续 10min', level: 'critical', enabled: true },
  { id: '5', name: '产物异常', condition: '产物大小 > 100MB', level: 'info', enabled: false },
]

function LevelBadge({ level }: { level: AlertLevel }) {
  const colors = {
    info: { bg: 'bg-[#3B82F6]/15', text: 'text-[#3B82F6]' },
    warn: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]' },
    critical: { bg: 'bg-[#EF4444]/15', text: 'text-[#EF4444]' },
  }
  const c = colors[level]
  const label = { info: '信息', warn: '警告', critical: '紧急' }[level]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {label}
    </span>
  )
}

function MetricCard({
  title,
  value,
  sub,
  icon,
  color,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 hover:border-[rgba(0,212,255,0.15)] transition-colors duration-250"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <span className="text-[11px] text-[#64748B] uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-h3 text-[#F1F5F9]">{value}</span>
        {sub && (
          <span className="text-xs text-[#64748B]">{sub}</span>
        )}
      </div>
    </motion.div>
  )
}

function SystemGaugeCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number | undefined
  icon: React.ReactNode
  color: string
}) {
  const safeValue = value ?? 0
  const data = useMemo(() => [
    { name: 'used', value: safeValue },
    { name: 'free', value: Math.max(0, 100 - safeValue) },
  ], [safeValue])

  return (
    <motion.div
      variants={itemVariants}
      className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 hover:border-[rgba(0,212,255,0.15)] transition-colors duration-250"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <span className="text-[11px] text-[#64748B] uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={18}
                outerRadius={28}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="rgba(148,163,184,0.08)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <span className="text-h3 text-[#F1F5F9]">{safeValue.toFixed(1)}%</span>
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[rgba(148,163,184,0.1)]" />
        <div className="h-3 w-16 bg-[rgba(148,163,184,0.1)] rounded" />
      </div>
      <div className="h-7 w-20 bg-[rgba(148,163,184,0.1)] rounded" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 animate-pulse">
      <div className="h-4 w-32 bg-[rgba(148,163,184,0.1)] rounded mb-4" />
      <div className="h-[220px] bg-[rgba(148,163,184,0.05)] rounded-lg" />
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1A2234] border border-[rgba(148,163,184,0.15)] rounded-lg p-3 shadow-card">
      <p className="text-xs text-[#64748B] mb-1">{label}</p>
      {payload.map((p: any, idx: number) => (
        <p key={idx} className="text-sm" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          {p.name === 'error_rate' ? '%' : p.name === 'avg_response_time_ms' ? 'ms' : ''}
        </p>
      ))}
    </div>
  )
}

export default function MonitoringTab() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(initialAlertRules)
  const [cpuThreshold, setCpuThreshold] = useState('90')
  const [memoryThreshold, setMemoryThreshold] = useState('85')
  const [timeRange, setTimeRange] = useState('24h')

  const {
    data: systemMetrics,
    loading: sysLoading,
    error: sysError,
  } = useSystemMetrics()

  const {
    data: agentMetrics,
    loading: agentLoading,
    error: agentError,
  } = useAgentMetrics()

  const toggleRule = useCallback((id: string) => {
    setAlertRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }, [])

  const deleteRule = useCallback((id: string) => {
    setAlertRules(prev => prev.filter(r => r.id !== id))
  }, [])

  // Compute summary metrics from real data
  const summaryMetrics = useMemo(() => {
    if (!agentMetrics || agentMetrics.length === 0) return null
    const totalTasks = agentMetrics.reduce((sum, a) => sum + a.task_count, 0)
    const avgResponse = agentMetrics.reduce((sum, a) => sum + a.avg_response_time_ms, 0) / agentMetrics.length
    const avgErrorRate = agentMetrics.reduce((sum, a) => sum + a.error_rate, 0) / agentMetrics.length
    return { totalTasks, avgResponse, avgErrorRate, agentCount: agentMetrics.length }
  }, [agentMetrics])

  const isLoading = sysLoading || agentLoading
  const hasError = sysError || agentError

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <motion.div
        variants={itemVariants}
        className="bg-[#111827] rounded-xl border border-[rgba(239,68,68,0.2)] p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-[#EF4444]/15 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} className="text-[#EF4444]" />
        </div>
        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">数据加载失败</h3>
        <p className="text-sm text-[#94A3B8]">{sysError || agentError}</p>
      </motion.div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* System Resource Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <SystemGaugeCard
          title="CPU 使用率"
          value={systemMetrics?.cpu_percent}
          icon={<Cpu size={16} />}
          color="#00D4FF"
        />
        <SystemGaugeCard
          title="内存使用率"
          value={systemMetrics?.memory_percent}
          icon={<Database size={16} />}
          color="#8B5CF6"
        />
        <SystemGaugeCard
          title="磁盘使用率"
          value={systemMetrics?.disk_usage_percent}
          icon={<HardDrive size={16} />}
          color="#F59E0B"
        />
        <MetricCard
          title="Agent 数量"
          value={summaryMetrics ? `${summaryMetrics.agentCount}` : '—'}
          sub={summaryMetrics ? `总任务: ${summaryMetrics.totalTasks}` : undefined}
          icon={<Server size={16} />}
          color="#10B981"
        />
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="平均响应时间"
          value={summaryMetrics ? `${Math.round(summaryMetrics.avgResponse)}ms` : '—'}
          icon={<Activity size={16} />}
          color="#00D4FF"
        />
        <MetricCard
          title="总任务数"
          value={summaryMetrics ? String(summaryMetrics.totalTasks) : '—'}
          icon={<Zap size={16} />}
          color="#10B981"
        />
        <MetricCard
          title="Agent 可用数"
          value={summaryMetrics ? `${summaryMetrics.agentCount}` : '—'}
          icon={<TrendingUp size={16} />}
          color="#8B5CF6"
        />
        <MetricCard
          title="平均错误率"
          value={summaryMetrics ? `${(summaryMetrics.avgErrorRate * 100).toFixed(1)}%` : '—'}
          icon={<AlertTriangle size={16} />}
          color="#EF4444"
        />
      </div>

      {/* Time range selector */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[#64748B]">时间范围:</span>
        {(['1h', '24h', '7d'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              timeRange === r
                ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                : 'text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)]'
            }`}
          >
            {r === '1h' ? '最近 1 小时' : r === '24h' ? '最近 24 小时' : '最近 7 天'}
          </button>
        ))}
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
        {/* Agent Response Times */}
        <motion.div variants={itemVariants} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5">
          <h4 className="text-sm font-semibold text-[#F1F5F9] mb-4">Agent 响应时间</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={agentMetrics ?? []}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="agent_name"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit="ms"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_response_time_ms" fill="#00D4FF" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Task Count per Agent */}
        <motion.div variants={itemVariants} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5">
          <h4 className="text-sm font-semibold text-[#F1F5F9] mb-4">任务处理量</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={agentMetrics ?? []}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="agent_name"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="task_count"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#taskGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Error Rate per Agent */}
        <motion.div variants={itemVariants} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5">
          <h4 className="text-sm font-semibold text-[#F1F5F9] mb-4">Agent 错误率</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={agentMetrics ?? []}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="agent_name"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="error_rate"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#errorGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* System Memory Usage */}
        <motion.div variants={itemVariants} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5">
          <h4 className="text-sm font-semibold text-[#F1F5F9] mb-4">内存使用</h4>
          {systemMetrics ? (
            <div className="flex items-center gap-6 h-[220px]">
              <div className="w-[140px] h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: '已用', value: systemMetrics.memory_used_mb },
                        { name: '可用', value: Math.max(0, systemMetrics.memory_total_mb - systemMetrics.memory_used_mb) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#8B5CF6" />
                      <Cell fill="rgba(148,163,184,0.08)" />
                    </Pie>
                    <Tooltip content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-[#1A2234] border border-[rgba(148,163,184,0.15)] rounded-lg p-2 text-xs">
                          <p style={{ color: payload[0].color }}>
                            {payload[0].name}: {payload[0].value.toFixed(0)} MB
                          </p>
                        </div>
                      )
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#64748B]">已用内存</p>
                  <p className="text-lg font-semibold text-[#8B5CF6]">
                    {systemMetrics.memory_used_mb.toFixed(0)} MB
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">总内存</p>
                  <p className="text-lg font-semibold text-[#F1F5F9]">
                    {systemMetrics.memory_total_mb.toFixed(0)} MB
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">使用率</p>
                  <p className="text-lg font-semibold text-[#F1F5F9]">
                    {systemMetrics.memory_percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <span className="text-sm text-[#64748B]">暂无数据</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Agent Performance Comparison */}
      <motion.div variants={itemVariants} className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 mb-8">
        <h4 className="text-sm font-semibold text-[#F1F5F9] mb-4">Agent 性能对比 — 任务完成数</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={agentMetrics ?? []}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              dataKey="agent_name"
              type="category"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#1A2234',
                border: '1px solid rgba(148,163,184,0.15)',
                borderRadius: '8px',
                fontSize: 13,
              }}
              labelStyle={{ color: '#F1F5F9' }}
              itemStyle={{ color: '#94A3B8' }}
            />
            <Bar dataKey="task_count" fill="#00D4FF" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <Separator className="bg-[rgba(148,163,184,0.08)] mb-8" />

      {/* Alert Rules */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="pb-2 mb-4 border-b border-[rgba(148,163,184,0.08)] flex items-center justify-between">
          <h3 className="text-h4 text-[#F1F5F9]">告警规则</h3>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00D4FF]/15 text-[#00D4FF] hover:bg-[#00D4FF]/25 transition-all duration-200">
            <Plus size={14} />
            添加规则
          </button>
        </div>
        <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] overflow-hidden">
          <div className="grid grid-cols-[1fr_180px_100px_80px_100px] gap-4 px-5 py-3 text-xs text-[#64748B] font-medium uppercase tracking-wider border-b border-[rgba(148,163,184,0.08)]">
            <span>规则</span>
            <span>条件</span>
            <span>级别</span>
            <span>状态</span>
            <span className="text-right">操作</span>
          </div>
          {alertRules.map((rule) => (
            <div
              key={rule.id}
              className="grid grid-cols-[1fr_180px_100px_80px_100px] gap-4 px-5 py-3 items-center border-b border-[rgba(148,163,184,0.08)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            >
              <span className="text-sm text-[#F1F5F9]">{rule.name}</span>
              <span className="text-xs font-mono text-[#94A3B8]">{rule.condition}</span>
              <LevelBadge level={rule.level} />
              <Switch
                checked={rule.enabled}
                onCheckedChange={() => toggleRule(rule.id)}
                className="data-[state=checked]:bg-[#00D4FF]"
              />
              <div className="flex items-center justify-end gap-1">
                <button className="p-1.5 rounded-md text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-all">
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 rounded-md text-[#64748B] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Threshold Settings */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="pb-2 mb-4 border-b border-[rgba(148,163,184,0.08)]">
          <h3 className="text-h4 text-[#F1F5F9]">资源阈值</h3>
        </div>
        <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <Label className="text-sm text-[#94A3B8]">CPU 告警阈值 (%)</Label>
              <p className="text-xs text-[#64748B] mt-0.5">超过此值持续 10 分钟触发告警</p>
            </div>
            <Input
              type="number"
              value={cpuThreshold}
              onChange={(e) => setCpuThreshold(e.target.value)}
              className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 w-24"
            />
          </div>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <Label className="text-sm text-[#94A3B8]">内存告警阈值 (%)</Label>
              <p className="text-xs text-[#64748B] mt-0.5">超过此值持续 10 分钟触发告警</p>
            </div>
            <Input
              type="number"
              value={memoryThreshold}
              onChange={(e) => setMemoryThreshold(e.target.value)}
              className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 w-24"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
