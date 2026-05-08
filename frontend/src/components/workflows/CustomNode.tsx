import type { FC } from 'react'
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import {
  Play,
  Square,
  GitBranch,
  RefreshCw,
  Split,
  Merge,
  Clock,
  UserCheck,
  MessageSquare,
  Code,
  Terminal,
  Zap,
  Mail,
  MousePointer,
  Download,
  Upload,
  Database,
  Globe,
  FileCode,
  Package,
} from 'lucide-react'
import type { WorkflowNodeData, NodeStatus } from './types'

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: 'border-[rgba(148,163,184,0.15)]',
  running: 'border-[#00D4FF] shadow-[0_0_0_4px_rgba(0,212,255,0.2)] animate-pulse-glow',
  completed: 'border-[#10B981]',
  error: 'border-[#EF4444] bg-[rgba(239,68,68,0.1)]',
}

const STATUS_GLOW: Record<NodeStatus, string> = {
  idle: '',
  running: 'shadow-[0_0_16px_rgba(0,212,255,0.3)]',
  completed: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  error: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
}

const STATUS_INDICATOR: Record<NodeStatus, { bg: string; pulse: boolean }> = {
  idle: { bg: 'bg-[#64748B]', pulse: false },
  running: { bg: 'bg-[#00D4FF]', pulse: true },
  completed: { bg: 'bg-[#10B981]', pulse: false },
  error: { bg: 'bg-[#EF4444]', pulse: false },
}

const iconMap: Record<string, FC<{ size?: number; className?: string }>> = {
  Play,
  Square,
  GitBranch,
  RefreshCw,
  Split,
  Merge,
  Clock,
  UserCheck,
  MessageSquare,
  Code,
  Terminal,
  Zap,
  Mail,
  MousePointer,
  Download,
  Upload,
  Database,
  Globe,
  FileCode,
  Package,
}

const WorkflowNode = memo((props: NodeProps) => {
  const { data, selected } = props
  const { label, type, status, color, icon, description } = data as unknown as WorkflowNodeData
  const IconComponent = iconMap[icon] || MessageSquare
  const statusStyle = STATUS_COLORS[status]
  const statusGlow = STATUS_GLOW[status]
  const indicator = STATUS_INDICATOR[status]

  const isStartOrEnd = type === 'start' || type === 'end'

  return (
    <div
      className={`
        relative rounded-lg transition-all duration-200
        ${isStartOrEnd ? 'w-[100px]' : 'w-[180px]'}
        ${status} === 'running' ? 'animate-pulse-glow' : ''
      `}
    >
      {/* Status indicator dot */}
      <div
        className={`
          absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-[#111827] z-10
          ${indicator.bg}
          ${indicator.pulse ? 'animate-pulse' : ''}
        `}
      />

      {/* Node body */}
      <div
        className={`
          bg-[#111827] rounded-lg border
          ${selected ? 'border-2 border-[#00D4FF] shadow-[0_0_0_4px_rgba(0,212,255,0.2)]' : `border ${statusStyle} ${statusGlow}`}
          ${status === 'running' ? 'bg-[rgba(0,212,255,0.05)]' : ''}
          ${status === 'completed' ? 'bg-[rgba(16,185,129,0.05)]' : ''}
          overflow-hidden
        `}
      >
        {/* Color strip on left */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
          style={{ backgroundColor: status === 'completed' ? '#10B981' : status === 'error' ? '#EF4444' : color }}
        />

        {/* Content */}
        <div className="px-3 py-2.5 pl-4">
          <div className="flex items-center gap-2">
            <span style={{ color }}>
              <IconComponent size={16} />
            </span>
            <span className="text-[13px] font-medium text-[#F1F5F9] truncate">{label}</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1 truncate">{description}</p>

          {/* Status badge */}
          {status !== 'idle' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`
                  inline-block w-1.5 h-1.5 rounded-full
                  ${status === 'running' ? 'bg-[#00D4FF] animate-pulse' : ''}
                  ${status === 'completed' ? 'bg-[#10B981]' : ''}
                  ${status === 'error' ? 'bg-[#EF4444]' : ''}
                `}
              />
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider">
                {status === 'running' ? '运行中' : status === 'completed' ? '已完成' : status === 'error' ? '错误' : '空闲'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Input handles */}
      {type !== 'start' && type !== 'input' && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!w-2.5 !h-2.5 !bg-[#0A0E17] !border-2 !border-[#94A3B8] hover:!border-[#00D4FF] hover:!w-3.5 hover:!h-3.5 transition-all"
          style={{ left: -6 }}
        />
      )}

      {/* Output handles */}
      {type !== 'end' && type !== 'output' && (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="!w-2.5 !h-2.5 !bg-[#00D4FF] !border-2 !border-[#00D4FF] hover:!w-3.5 hover:!h-3.5 hover:!shadow-[0_0_8px_rgba(0,212,255,0.5)] transition-all"
          style={{ right: -6 }}
        />
      )}

      {/* Second output for condition nodes */}
      {(type === 'condition' || type === 'loop') && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="!w-2.5 !h-2.5 !bg-[#F59E0B] !border-2 !border-[#F59E0B] hover:!w-3.5 hover:!h-3.5 transition-all"
          style={{ bottom: -6 }}
        />
      )}
    </div>
  )
})

WorkflowNode.displayName = 'WorkflowNode'

export default WorkflowNode
