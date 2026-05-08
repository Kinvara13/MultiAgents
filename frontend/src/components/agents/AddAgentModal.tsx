import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Globe,
  Cpu,
  Zap,
  Shield,
  Code2,
  Terminal,
  MousePointerClick,
  Plus,
} from 'lucide-react'

interface AddAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (data: { name: string; slug: string; type: 'local' | 'remote'; endpoint: string; capabilities: string[] }) => void
  submitting?: boolean
}

const agentTypes = [
  { id: 'openclaw', name: 'OpenClaw', desc: '通用型远程 Agent，擅长自主调度和定时任务', icon: Globe, color: '#7C3AED' },
  { id: 'hermes', name: 'Hermes', desc: '学习型远程 Agent，专注于技能蒸馏和记忆', icon: Zap, color: '#D97706' },
  { id: 'claude', name: 'Claude', desc: '深度推理型本地 Agent，擅长代码审查', icon: Shield, color: '#6366F1' },
  { id: 'codex', name: 'Codex', desc: '代码专家型本地 Agent，专注代码生成', icon: Code2, color: '#06B6D4' },
  { id: 'trae', name: 'Trae', desc: '系统运维型本地 Agent，擅长终端操作', icon: Terminal, color: '#10B981' },
  { id: 'cursor', name: 'Cursor', desc: 'IDE 增强型本地 Agent，专注代码补全', icon: MousePointerClick, color: '#8B5CF6' },
  { id: 'custom', name: '自定义', desc: '使用自定义 API 端点接入任意 Agent', icon: Cpu, color: '#64748B' },
]

const allCapabilities = [
  '自主调度', 'Cron 任务', '浏览器控制', 'Shell 执行', 'API 编排',
  '记忆系统', '技能蒸馏', '跨会话', '自学习', '知识库',
  '深度推理', '代码审查', '文档生成', '架构设计', '需求分析',
  '代码生成', '重构', '测试用例', '多语言', 'Debug',
  '终端操作', '系统集成', '文件管理', '进程控制', '环境配置',
  '实时代补', '智能编辑', '代码导航', '类型推断',
]

const steps = ['选择类型', '配置连接', '设置能力', '确认']

export default function AddAgentModal({ isOpen, onClose, onSubmit, submitting }: AddAgentModalProps) {
  const [step, setStep] = useState(0)
  const [selectedType, setSelectedType] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    apiKey: '',
    selectedCapabilities: [] as string[],
    enableOnAdd: true,
  })

  const reset = () => {
    setStep(0)
    setSelectedType('')
    setFormData({
      name: '',
      host: '',
      port: '',
      apiKey: '',
      selectedCapabilities: [],
      enableOnAdd: true,
    })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const toggleCapability = (cap: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCapabilities: prev.selectedCapabilities.includes(cap)
        ? prev.selectedCapabilities.filter((c) => c !== cap)
        : [...prev.selectedCapabilities, cap],
    }))
  }

  const selectedAgentType = agentTypes.find((a) => a.id === selectedType)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 bg-[#0A0E17]/60 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#111827] rounded-2xl border border-[rgba(148,163,184,0.15)] w-full max-w-[600px] max-h-[80dvh] flex flex-col overflow-hidden pointer-events-auto shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(148,163,184,0.08)]">
                <div>
                  <h3 className="text-h4 text-[#F1F5F9]">添加 Agent</h3>
                  <p className="text-caption text-[#64748B] mt-0.5">{steps[step]}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <X size={18} className="text-[#94A3B8]" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-0 px-5 pt-4">
                {steps.map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-300 ${
                        i < step
                          ? 'bg-[#10B981] text-white'
                          : i === step
                            ? 'bg-[#00D4FF] text-[#0A0E17] shadow-[0_0_8px_rgba(0,212,255,0.3)]'
                            : 'bg-[#1A2234] text-[#64748B] border border-[rgba(148,163,184,0.15)]'
                      }`}
                    >
                      {i < step ? <Check size={14} /> : i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 h-[1px] mx-2 bg-[rgba(148,163,184,0.15)] relative">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#00D4FF] transition-all duration-300"
                          style={{ width: i < step ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      {agentTypes.map((agent) => {
                        const Icon = agent.icon
                        const isSelected = selectedType === agent.id
                        return (
                          <button
                            key={agent.id}
                            onClick={() => setSelectedType(agent.id)}
                            className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-200 ${
                              isSelected
                                ? 'border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.06)]'
                                : 'border-[rgba(148,163,184,0.08)] bg-[#151D2C] hover:border-[rgba(148,163,184,0.2)]'
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: agent.color + '30' }}
                            >
                              <Icon size={20} style={{ color: agent.color }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#F1F5F9]">{agent.name}</p>
                              <p className="text-caption text-[#64748B] mt-0.5 leading-relaxed">{agent.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}

                  {step === 1 && selectedAgentType && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-3 p-3 bg-[#151D2C] rounded-xl">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: selectedAgentType.color + '30' }}
                        >
                          <selectedAgentType.icon size={20} style={{ color: selectedAgentType.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#F1F5F9]">{selectedAgentType.name}</p>
                          <p className="text-caption text-[#64748B]">{selectedAgentType.desc}</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-caption text-[#64748B] mb-1.5">Agent 名称</label>
                        <input
                          type="text"
                          placeholder={`例如：${selectedAgentType.name}-prod`}
                          value={formData.name}
                          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-caption text-[#64748B] mb-1.5">连接地址</label>
                          <input
                            type="text"
                            placeholder="localhost"
                            value={formData.host}
                            onChange={(e) => setFormData((p) => ({ ...p, host: e.target.value }))}
                            className="w-full px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-caption text-[#64748B] mb-1.5">端口</label>
                          <input
                            type="text"
                            placeholder="8080"
                            value={formData.port}
                            onChange={(e) => setFormData((p) => ({ ...p, port: e.target.value }))}
                            className="w-full px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-caption text-[#64748B] mb-1.5">API 密钥</label>
                        <input
                          type="password"
                          placeholder="sk-..."
                          value={formData.apiKey}
                          onChange={(e) => setFormData((p) => ({ ...p, apiKey: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                        />
                      </div>

                      <button className="w-full py-2 border border-[rgba(0,212,255,0.2)] text-[#00D4FF] rounded-lg text-sm font-medium hover:bg-[rgba(0,212,255,0.06)] transition-all duration-200">
                        测试连接
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-caption text-[#64748B] mb-2">选择能力标签（可多选）</label>
                        <div className="flex flex-wrap gap-2">
                          {allCapabilities.map((cap) => {
                            const isSelected = formData.selectedCapabilities.includes(cap)
                            return (
                              <button
                                key={cap}
                                onClick={() => toggleCapability(cap)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-[rgba(0,212,255,0.15)] border-[rgba(0,212,255,0.3)] text-[#00D4FF]'
                                    : 'bg-[#151D2C] border-[rgba(148,163,184,0.1)] text-[#94A3B8] hover:border-[rgba(148,163,184,0.25)]'
                                }`}
                              >
                                {cap}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-caption text-[#64748B] mb-1.5">自定义能力</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="输入自定义能力名称"
                            className="flex-1 px-3 py-2 bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg text-body-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                          />
                          <button className="px-3 py-2 bg-[#1A2234] text-[#94A3B8] rounded-lg hover:bg-[#252d3e] transition-colors">
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="bg-[#151D2C] rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-[#F1F5F9]">配置摘要</h4>
                        <div className="space-y-2 text-body-sm">
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">Agent 类型</span>
                            <span className="text-[#F1F5F9]">{selectedAgentType?.name || '未知'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">名称</span>
                            <span className="text-[#F1F5F9]">{formData.name || '未设置'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">连接地址</span>
                            <span className="text-[#F1F5F9] font-mono">{formData.host || 'localhost'}:{formData.port || '8080'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">能力标签</span>
                            <span className="text-[#F1F5F9]">{formData.selectedCapabilities.length} 个</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-300 ${
                            formData.enableOnAdd ? 'bg-[#10B981]' : 'bg-[#1A2234]'
                          }`}
                          onClick={() => setFormData((p) => ({ ...p, enableOnAdd: !p.enableOnAdd }))}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${
                              formData.enableOnAdd ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </div>
                        <label className="text-body-sm text-[#94A3B8] cursor-pointer"
                          onClick={() => setFormData((p) => ({ ...p, enableOnAdd: !p.enableOnAdd }))}
                        >
                          添加后立即启用
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(148,163,184,0.08)]">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    step === 0
                      ? 'text-[#64748B] cursor-not-allowed'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <ChevronLeft size={16} />
                  上一步
                </button>

                {step < steps.length - 1 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={step === 0 && !selectedType}
                    className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      step === 0 && !selectedType
                        ? 'bg-[#1A2234] text-[#64748B] cursor-not-allowed'
                        : 'bg-[#00D4FF] text-[#0A0E17] hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)]'
                    }`}
                  >
                    下一步
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (onSubmit && selectedAgentType) {
                        const type: 'local' | 'remote' =
                          selectedAgentType.id === 'openclaw' || selectedAgentType.id === 'hermes'
                            ? 'remote'
                            : selectedAgentType.id === 'custom'
                              ? (formData.port === '443' || formData.port === '80' || formData.host.includes('http') ? 'remote' : 'local')
                              : 'local'
                        await onSubmit({
                          name: formData.name || selectedAgentType.name,
                          slug: (formData.name || selectedAgentType.name).toLowerCase().replace(/\s+/g, '-'),
                          type,
                          endpoint: formData.port
                            ? `${formData.host || 'localhost'}:${formData.port}`
                            : (formData.host || 'localhost'),
                          capabilities: formData.selectedCapabilities,
                        })
                        handleClose()
                      } else {
                        handleClose()
                      }
                    }}
                    disabled={submitting || !selectedAgentType}
                    className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      submitting || !selectedAgentType
                        ? 'bg-[#1A2234] text-[#64748B] cursor-not-allowed'
                        : 'bg-[#00D4FF] text-[#0A0E17] hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)]'
                    }`}
                  >
                    {submitting ? '添加中...' : '确认添加'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
