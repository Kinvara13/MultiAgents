import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Globe,
  Server,
  Bot,
  AlertTriangle,
} from 'lucide-react'
import { useAgents, useAgentMutations } from '@/hooks/useApi'
import type { AgentResponse } from '@/api/types'

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

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  online: { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]', label: '在线' },
  offline: { bg: 'bg-[#EF4444]/15', text: 'text-[#EF4444]', label: '离线' },
  busy: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]', label: '忙碌' },
  error: { bg: 'bg-[#EF4444]/15', text: 'text-[#EF4444]', label: '错误' },
}

type TestState = 'idle' | 'testing' | 'connected' | 'failed'

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-[#10B981]',
    offline: 'bg-[#EF4444]',
    busy: 'bg-[#F59E0B]',
    error: 'bg-[#EF4444]',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-[#64748B]'} ${
        status === 'online' ? 'shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''
      }`}
    />
  )
}

function AgentStatusBadge({ status }: { status: string }) {
  const config = STATUS_COLORS[status] || { bg: 'bg-[#64748B]/15', text: 'text-[#64748B]', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg} ${config.text} text-xs`}>
      <StatusDot status={status} />
      {config.label}
    </span>
  )
}

function TestResultBadge({ state, latency }: { state: TestState; latency?: number }) {
  if (state === 'testing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] text-xs">
        <Loader2 size={12} className="animate-spin" />
        测试中
      </span>
    )
  }
  if (state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-xs">
        <CheckCircle size={12} />
        已连接
        {latency !== undefined && <span className="text-[10px] opacity-70">{latency}ms</span>}
      </span>
    )
  }
  if (state === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] text-xs">
        <XCircle size={12} />
        失败
      </span>
    )
  }
  return null
}

function getAgentIcon(type: string, iconName: string | null) {
  const size = 18
  if (iconName === 'server') return <Server size={size} />
  if (iconName === 'globe') return <Globe size={size} />
  if (iconName === 'zap') return <Zap size={size} />
  if (type === 'local') return <Server size={size} />
  if (type === 'remote') return <Globe size={size} />
  return <Bot size={size} />
}

function getAgentColor(type: string, color: string | null): string {
  if (color) return color
  return type === 'local' ? '#00D4FF' : '#8B5CF6'
}

function SkeletonAgentCard() {
  return (
    <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[rgba(148,163,184,0.1)]" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-[rgba(148,163,184,0.1)] rounded" />
        </div>
        <div className="h-5 w-16 bg-[rgba(148,163,184,0.1)] rounded-full" />
      </div>
      <div className="space-y-3">
        <div>
          <div className="h-3 w-20 bg-[rgba(148,163,184,0.1)] rounded mb-2" />
          <div className="h-9 bg-[rgba(148,163,184,0.05)] rounded" />
        </div>
        <div>
          <div className="h-3 w-20 bg-[rgba(148,163,184,0.1)] rounded mb-2" />
          <div className="h-9 bg-[rgba(148,163,184,0.05)] rounded" />
        </div>
        <div className="flex justify-end pt-1">
          <div className="h-7 w-20 bg-[rgba(148,163,184,0.1)] rounded" />
        </div>
      </div>
    </div>
  )
}

function AgentCard({
  agent,
  testState,
  testLatency,
  onTest,
}: {
  agent: AgentResponse
  testState: TestState
  testLatency?: number
  onTest: () => void
}) {
  const [showKey, setShowKey] = useState(false)

  const icon = getAgentIcon(agent.type, agent.icon)
  const color = getAgentColor(agent.type, agent.color)

  return (
    <motion.div
      variants={itemVariants}
      className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 hover:border-[rgba(0,212,255,0.15)] transition-colors duration-250"
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[#F1F5F9] truncate">{agent.name}</h4>
          <p className="text-[10px] text-[#64748B] font-mono truncate">{agent.slug}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <AgentStatusBadge status={agent.status} />
          <TestResultBadge state={testState} latency={testLatency} />
        </div>
      </div>

      <div className="space-y-3">
        {/* Endpoint */}
        <div>
          <Label className="text-xs text-[#64748B] mb-1.5 block">API Endpoint</Label>
          <Input
            value={agent.endpoint || '无'}
            readOnly
            className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#94A3B8] text-sm cursor-default"
          />
        </div>

        {/* Capabilities */}
        <div>
          <Label className="text-xs text-[#64748B] mb-1.5 block">Capabilities</Label>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.length > 0 ? (
              agent.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[rgba(0,212,255,0.08)] text-[#00D4FF] border border-[rgba(0,212,255,0.12)]"
                >
                  {cap}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#64748B]">无</span>
            )}
          </div>
        </div>

        {/* API Key (placeholder) */}
        <div>
          <Label className="text-xs text-[#64748B] mb-1.5 block">API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value="••••••••"
              readOnly
              className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#94A3B8] text-sm cursor-default pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9] transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-4 pt-1 text-xs text-[#64748B]">
          <span>任务: <span className="text-[#F1F5F9]">{agent.total_tasks}</span></span>
          <span>成功率: <span className="text-[#F1F5F9]">{(agent.success_rate * 100).toFixed(1)}%</span></span>
        </div>

        {/* Test Connection Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onTest}
            disabled={testState === 'testing'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(148,163,184,0.15)] text-[#94A3B8] hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9] transition-all duration-200 disabled:opacity-50"
          >
            {testState === 'testing' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            测试连接
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function ConnectionsTab() {
  const { data: agentsData, loading: agentsLoading, error: agentsError } = useAgents()
  const { test } = useAgentMutations()

  const [localDiscovery, setLocalDiscovery] = useState(true)
  const [remoteWhitelist, setRemoteWhitelist] = useState('192.168.1.0/24\n10.0.0.0/8')
  const [wsUrl, setWsUrl] = useState('wss://agentnexus.local/ws')
  const [connectionTimeout, setConnectionTimeout] = useState('30')
  const [heartbeatInterval, setHeartbeatInterval] = useState('15')
  const [retryCount, setRetryCount] = useState('3')

  // Track test state per agent
  const [testStates, setTestStates] = useState<Record<string, { state: TestState; latency?: number }>>({})

  const handleTest = useCallback(
    async (agentId: string) => {
      setTestStates((prev) => ({ ...prev, [agentId]: { state: 'testing' } }))
      try {
        const result = await test(agentId)
        if (result.status === 'connected') {
          setTestStates((prev) => ({
            ...prev,
            [agentId]: { state: 'connected', latency: result.latency_ms },
          }))
        } else {
          setTestStates((prev) => ({ ...prev, [agentId]: { state: 'failed' } }))
        }
      } catch {
        setTestStates((prev) => ({ ...prev, [agentId]: { state: 'failed' } }))
      }
    },
    [test]
  )

  const agents = agentsData?.items ?? []

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Agent Connections */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="pb-2 mb-4 border-b border-[rgba(148,163,184,0.08)]">
          <h3 className="text-h4 text-[#F1F5F9]">Agent 连接</h3>
        </div>

        {agentsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonAgentCard key={i} />
            ))}
          </div>
        )}

        {agentsError && (
          <div className="bg-[#111827] rounded-xl border border-[rgba(239,68,68,0.2)] p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EF4444]/15 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} className="text-[#EF4444]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">加载失败</h3>
            <p className="text-sm text-[#94A3B8]">{agentsError}</p>
          </div>
        )}

        {!agentsLoading && !agentsError && (
          <>
            {agents.length === 0 ? (
              <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[rgba(148,163,184,0.08)] flex items-center justify-center mx-auto mb-3">
                  <Server size={24} className="text-[#64748B]" />
                </div>
                <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">暂无 Agent</h3>
                <p className="text-sm text-[#64748B]">当前系统中没有配置任何 Agent</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    testState={testStates[agent.id]?.state || 'idle'}
                    testLatency={testStates[agent.id]?.latency}
                    onTest={() => handleTest(agent.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      <Separator className="bg-[rgba(148,163,184,0.08)] mb-8" />

      {/* Connection Settings */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="pb-2 mb-4 border-b border-[rgba(148,163,184,0.08)]">
          <h3 className="text-h4 text-[#F1F5F9]">连接设置</h3>
        </div>
        <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <Label className="text-sm text-[#94A3B8]">本地 Agent 自动发现</Label>
              <p className="text-xs text-[#64748B] mt-0.5">自动检测 localhost 端口上的 Agent 服务</p>
            </div>
            <Switch
              checked={localDiscovery}
              onCheckedChange={setLocalDiscovery}
              className="data-[state=checked]:bg-[#00D4FF]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-[#94A3B8]">远程 Agent 白名单</Label>
            <p className="text-xs text-[#64748B]">每行一个 CIDR 或 IP 地址</p>
            <textarea
              value={remoteWhitelist}
              onChange={(e) => setRemoteWhitelist(e.target.value)}
              rows={3}
              className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#00D4FF]/50 focus:outline-none resize-none font-mono"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-[#94A3B8]">连接超时（秒）</Label>
              <Input
                type="number"
                value={connectionTimeout}
                onChange={(e) => setConnectionTimeout(e.target.value)}
                className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-[#94A3B8]">心跳间隔（秒）</Label>
              <Input
                type="number"
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(e.target.value)}
                className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-[#94A3B8]">重试次数</Label>
              <Input
                type="number"
                value={retryCount}
                onChange={(e) => setRetryCount(e.target.value)}
                className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-[#94A3B8]">WebSocket 地址</Label>
              <Input
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
