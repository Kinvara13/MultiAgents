import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings } from 'lucide-react'
import type { WorkflowNodeData, NodeConfig, AgentNodeConfig, ConditionNodeConfig } from './types'

interface PropertiesPanelProps {
  selectedNode: WorkflowNodeData | null
  workflowName: string
  workflowDescription: string
  onWorkflowNameChange?: (name: string) => void
  onWorkflowDescriptionChange?: (desc: string) => void
  onClose: () => void
}

function AgentProperties({ config }: { config: NodeConfig }) {
  const agent = config.agent as AgentNodeConfig | undefined
  const [taskDesc, setTaskDesc] = useState(agent?.taskDescription || '')
  const [timeout, setTimeout] = useState(agent?.timeout || 300)
  const [retries, setRetries] = useState(agent?.retryCount || 2)

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">选择 Agent</label>
        <select className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors">
          <option>Claude (本地)</option>
          <option>Codex (本地)</option>
          <option>Trae (本地)</option>
          <option>OpenClaw (远程)</option>
          <option>Hermes (远程)</option>
        </select>
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">任务描述</label>
        <textarea
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
          rows={3}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors resize-none"
          placeholder="输入任务描述..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] text-[#64748B] block mb-1.5">超时 (秒)</label>
          <input
            type="number"
            value={timeout}
            onChange={(e) => setTimeout(Number(e.target.value))}
            className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[12px] text-[#64748B] block mb-1.5">重试次数</label>
          <input
            type="number"
            value={retries}
            onChange={(e) => setRetries(Number(e.target.value))}
            className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">失败处理</label>
        <select className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors">
          <option>停止工作流</option>
          <option>跳过节点</option>
          <option>重试</option>
        </select>
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">输出变量</label>
        <input
          type="text"
          defaultValue={agent?.outputVariable || ''}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
          placeholder="result"
        />
      </div>
    </div>
  )
}

function ConditionProperties({ config }: { config: NodeConfig }) {
  const cond = config.condition as ConditionNodeConfig | undefined
  const [expression, setExpression] = useState(cond?.expression || '')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">条件表达式</label>
        <input
          type="text"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] font-mono focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
          placeholder="has_test_files"
        />
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">变量引用</label>
        <select className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors">
          <option>pr_analysis.has_tests</option>
          <option>input.topic</option>
          <option>cleaned_data.valid</option>
        </select>
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">比较操作</label>
        <select className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors">
          <option>等于</option>
          <option>不等于</option>
          <option>包含</option>
          <option>大于</option>
          <option>小于</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] text-[#64748B] block mb-1.5">True 标签</label>
          <input
            type="text"
            defaultValue={cond?.trueLabel || '是'}
            className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[12px] text-[#64748B] block mb-1.5">False 标签</label>
          <input
            type="text"
            defaultValue={cond?.falseLabel || '否'}
            className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  )
}

function CommonProperties({ config }: { config: NodeConfig }) {
  const [label, setLabel] = useState(config.label || '')
  const [desc, setDesc] = useState(config.description || '')
  const [notes, setNotes] = useState(config.notes || '')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">节点名称</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">描述</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors resize-none"
        />
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">颜色标记</label>
        <div className="flex gap-2">
          {['#00D4FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#64748B'].map((c) => (
            <button
              key={c}
              className="w-6 h-6 rounded-full border-2 border-transparent hover:border-[#F1F5F9] transition-colors"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">备注</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors resize-none"
        />
      </div>
    </div>
  )
}

function WorkflowProperties({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: {
  name: string
  description: string
  onNameChange?: (name: string) => void
  onDescriptionChange?: (desc: string) => void
}) {
  const [localName, setLocalName] = useState(name)
  const [localDesc, setLocalDesc] = useState(description)

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">工作流名称</label>
        <input
          type="text"
          value={localName}
          onChange={(e) => {
            setLocalName(e.target.value)
            onNameChange?.(e.target.value)
          }}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">描述</label>
        <textarea
          value={localDesc}
          onChange={(e) => {
            setLocalDesc(e.target.value)
            onDescriptionChange?.(e.target.value)
          }}
          rows={2}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors resize-none"
        />
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">触发方式</label>
        <select className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors">
          <option>手动触发</option>
          <option>定时触发</option>
          <option>Webhook</option>
          <option>Agent 事件</option>
        </select>
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">并发限制</label>
        <input
          type="number"
          defaultValue={5}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] text-[#64748B] block mb-1.5">全局超时 (秒)</label>
        <input
          type="number"
          defaultValue={3600}
          className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-[13px] text-[#F1F5F9] focus:border-[rgba(0,212,255,0.5)] focus:outline-none transition-colors"
        />
      </div>
    </div>
  )
}

export default function PropertiesPanel({
  selectedNode,
  workflowName,
  workflowDescription,
  onWorkflowNameChange,
  onWorkflowDescriptionChange,
  onClose,
}: PropertiesPanelProps) {
  const renderProperties = useCallback(() => {
    if (!selectedNode) {
      return (
        <WorkflowProperties
          name={workflowName}
          description={workflowDescription}
          onNameChange={onWorkflowNameChange}
          onDescriptionChange={onWorkflowDescriptionChange}
        />
      )
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedNode.type + (selectedNode.config.label || '')}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {/* Node info header */}
          <div className="flex items-center gap-3 pb-3 border-b border-[rgba(148,163,184,0.08)]">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${selectedNode.color}15` }}
            >
              <Settings size={16} style={{ color: selectedNode.color }} />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#F1F5F9]">{selectedNode.label}</p>
              <p className="text-[11px] text-[#64748B]">{selectedNode.description}</p>
            </div>
          </div>

          {/* Type-specific properties */}
          {selectedNode.category === 'agent' && (
            <AgentProperties config={selectedNode.config} />
          )}
          {selectedNode.type === 'condition' && (
            <ConditionProperties config={selectedNode.config} />
          )}

          {/* Common properties */}
          <div className="pt-3 border-t border-[rgba(148,163,184,0.08)]">
            <p className="text-caption text-[#64748B] uppercase tracking-[0.05em] mb-3">通用属性</p>
            <CommonProperties config={selectedNode.config} />
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }, [selectedNode, workflowName, workflowDescription, onWorkflowNameChange, onWorkflowDescriptionChange])

  return (
    <div className="w-[320px] bg-[#111827] border-l border-[rgba(148,163,184,0.08)] flex flex-col flex-shrink-0 z-20">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-[rgba(148,163,184,0.08)] flex-shrink-0">
        <span className="text-caption text-[#64748B] uppercase tracking-[0.05em]">
          {selectedNode ? '节点属性' : '工作流属性'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          <X size={14} className="text-[#94A3B8]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {renderProperties()}
      </div>
    </div>
  )
}
