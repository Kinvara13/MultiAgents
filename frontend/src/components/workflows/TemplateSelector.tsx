import { motion } from 'framer-motion'
import {
  GitBranch,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react'
import type { WorkflowDefinition } from './types'
import { CODE_REVIEW_WORKFLOW, RESEARCH_WORKFLOW, DATA_PIPELINE_WORKFLOW } from './types'

interface TemplateSelectorProps {
  onSelect: (workflow: WorkflowDefinition) => void
}

const templates = [
  {
    id: 'code-review',
    name: '自动化代码审查',
    description: '多 Agent 协同的 PR 代码审查流程：读取 PR、条件分支、并行审查、产物收集',
    icon: GitBranch,
    color: '#00D4FF',
    workflow: CODE_REVIEW_WORKFLOW,
  },
  {
    id: 'research',
    name: '多 Agent 研究分析',
    description: '多个 Agent 并行进行信息收集、分析和综合报告生成',
    icon: Sparkles,
    color: '#8B5CF6',
    workflow: RESEARCH_WORKFLOW,
  },
  {
    id: 'data-pipeline',
    name: '数据处理管道',
    description: 'ETL 数据流水线：清洗、验证、转换、存储全流程',
    icon: Database,
    color: '#10B981',
    workflow: DATA_PIPELINE_WORKFLOW,
  },
]

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.15)] flex items-center justify-center mx-auto mb-4">
            <GitBranch size={28} className="text-[#00D4FF]" />
          </div>
          <h3 className="text-h3 text-[#F1F5F9] mb-2">拖拽左侧节点到此处开始</h3>
          <p className="text-body text-[#64748B]">或选择一个模板快速开始</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-4 max-w-[720px]">
          {templates.map((template, i) => {
            const Icon = template.icon
            return (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + i * 0.1,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                }}
                onClick={() => onSelect(template.workflow)}
                className="
                  bg-[#111827] border border-[rgba(148,163,184,0.08)] rounded-xl p-5
                  hover:border-[rgba(0,212,255,0.3)] hover:translate-y-[-2px]
                  hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]
                  transition-all duration-250 text-left
                "
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${template.color}15` }}
                >
                  <Icon size={20} style={{ color: template.color }} />
                </div>
                <h4 className="text-[14px] font-medium text-[#F1F5F9] mb-1.5">{template.name}</h4>
                <p className="text-[12px] text-[#64748B] leading-relaxed">{template.description}</p>
                <div className="flex items-center gap-1 mt-3 text-[11px] text-[#00D4FF]">
                  <span>使用模板</span>
                  <ArrowRight size={12} />
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
