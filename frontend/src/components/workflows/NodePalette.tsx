import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
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
import type { NodeDefinition } from './types'
import { AGENT_NODES, CONTROL_NODES, DATA_NODES, TOOL_NODES } from './types'

const iconMap: Record<string, React.ElementType> = {
  Play, Square, GitBranch, RefreshCw, Split, Merge, Clock, UserCheck,
  MessageSquare, Code, Terminal, Zap, Mail, MousePointer,
  Download, Upload, Database, Globe, FileCode, Package,
}

const categoryLabels: Record<string, string> = {
  agent: '智能体节点',
  control: '控制节点',
  data: '数据节点',
  tool: '工具节点',
}

const categoryColors: Record<string, string> = {
  agent: '#8B5CF6',
  control: '#00D4FF',
  data: '#3B82F6',
  tool: '#94A3B8',
}

function DraggableNodeItem({ node }: { node: NodeDefinition }) {
  const IconComponent = iconMap[node.icon] || MessageSquare

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/reactflow', JSON.stringify(node))
      e.dataTransfer.effectAllowed = 'move'
    },
    [node]
  )

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="
        flex items-center gap-3 px-3 py-2.5 rounded-md
        cursor-grab active:cursor-grabbing active:opacity-70
        hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150
        group relative
      "
    >
      {/* Left color indicator */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: node.color }}
      />

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${node.color}15` }}
      >
        <IconComponent size={16} style={{ color: node.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#F1F5F9] truncate">{node.label}</p>
        <p className="text-[11px] text-[#64748B] truncate">{node.description}</p>
      </div>
    </div>
  )
}

function NodeCategory({
  title,
  color,
  nodes,
  defaultOpen = true,
}: {
  title: string
  color: string
  nodes: NodeDefinition[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[rgba(255,255,255,0.02)] rounded-md transition-colors"
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em] flex-1 text-left">
          {title}
        </span>
        <ChevronRight
          size={14}
          className={`text-[#64748B] transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-0.5">
              {nodes.map((node) => (
                <DraggableNodeItem key={node.type} node={node} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export interface NodePaletteProps {
  collapsed: boolean
  onToggle: () => void
}

export default function NodePalette({ collapsed, onToggle }: NodePaletteProps) {
  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 48 : 240 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="
        bg-[#111827] border-r border-[rgba(148,163,184,0.08)]
        flex flex-col overflow-hidden flex-shrink-0 z-20
      "
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[rgba(148,163,184,0.08)] flex-shrink-0">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-caption text-[#64748B] uppercase tracking-[0.05em]"
          >
            节点面板
          </motion.span>
        )}
        <button
          onClick={onToggle}
          className="
            p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors
            ml-auto
          "
        >
          {collapsed ? (
            <ChevronRight size={14} className="text-[#94A3B8]" />
          ) : (
            <ChevronLeft size={14} className="text-[#94A3B8]" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3 pt-2">
            {[AGENT_NODES[0], CONTROL_NODES[0], DATA_NODES[0], TOOL_NODES[0]].map((node) => {
              const IconComponent = iconMap[node.icon] || MessageSquare
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', JSON.stringify(node))
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="
                    w-8 h-8 rounded-lg flex items-center justify-center cursor-grab
                    hover:bg-[rgba(255,255,255,0.04)] transition-colors
                  "
                  style={{ backgroundColor: `${node.color}15` }}
                  title={node.label}
                >
                  <IconComponent size={16} style={{ color: node.color }} />
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <NodeCategory
              title={categoryLabels.agent}
              color={categoryColors.agent}
              nodes={AGENT_NODES}
            />
            <NodeCategory
              title={categoryLabels.control}
              color={categoryColors.control}
              nodes={CONTROL_NODES}
            />
            <NodeCategory
              title={categoryLabels.data}
              color={categoryColors.data}
              nodes={DATA_NODES}
            />
            <NodeCategory
              title={categoryLabels.tool}
              color={categoryColors.tool}
              nodes={TOOL_NODES}
              defaultOpen={false}
            />
          </>
        )}
      </div>
    </motion.div>
  )
}
