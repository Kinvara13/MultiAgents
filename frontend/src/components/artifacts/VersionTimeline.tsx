import { motion } from 'framer-motion'
import { GitCommit, ArrowLeftRight, Plus, Minus, Edit3 } from 'lucide-react'
import type { ArtifactVersion } from './types'
import { allVersions } from './mockData'

interface VersionTimelineProps {
  versions?: ArtifactVersion[]
}

const agentColors: Record<string, string> = {
  Claude: '#3B82F6',
  Codex: '#00D4FF',
  OpenClaw: '#8B5CF6',
  Hermes: '#F59E0B',
  Trae: '#10B981',
  Cursor: '#EF4444',
}

export default function VersionTimeline({ versions = allVersions }: VersionTimelineProps) {
  return (
    <div className="flex h-full">
      {/* Timeline */}
      <div className="w-[320px] border-r border-[rgba(148,163,184,0.08)] bg-[#111827] overflow-auto">
        <div className="p-4">
          <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-4">
            版本历史
          </h4>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-[rgba(148,163,184,0.08)]" />

            <div className="space-y-4">
              {versions.map((version, i) => {
                const color = agentColors[version.authorAgent] ?? '#94A3B8'
                return (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                    className="relative flex items-start gap-3 pl-1"
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 shrink-0 z-10 mt-0.5"
                      style={{ borderColor: color, backgroundColor: '#111827' }}
                    />
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-mono font-medium" style={{ color }}>
                          {version.version}
                        </span>
                        {i === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[rgba(0,212,255,0.1)] text-[#00D4FF] rounded">
                            current
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#F1F5F9] mb-1">{version.message}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#94A3B8]">{version.author}</span>
                        <span className="text-[10px] text-[#64748B]">{version.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-[#10B981]">
                          <Plus size={10} />{version.changes.added}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[#EF4444]">
                          <Minus size={10} />{version.changes.removed}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[#F59E0B]">
                          <Edit3 size={10} />{version.changes.modified}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-2 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]">
          <span className="text-xs text-[#64748B] font-mono">版本对比</span>
          <ArrowLeftRight size={14} className="text-[#64748B]" />
          <div className="flex items-center gap-2 ml-auto">
            <select className="text-[12px] bg-[#1A2234] text-[#F1F5F9] border border-[rgba(148,163,184,0.15)] rounded px-2 py-1">
              <option>v2.1.0 (current)</option>
              <option>v2.0.0</option>
              <option>v1.3.0</option>
            </select>
            <span className="text-[#64748B]">vs</span>
            <select className="text-[12px] bg-[#1A2234] text-[#F1F5F9] border border-[rgba(148,163,184,0.15)] rounded px-2 py-1">
              <option>v1.0.0</option>
              <option>v2.0.0</option>
              <option>v1.3.0</option>
            </select>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-[#0A0E17]">
          <div className="text-center">
            <GitCommit size={48} className="text-[rgba(148,163,184,0.12)] mx-auto mb-4" />
            <p className="text-[14px] text-[#64748B] mb-1">选择两个版本进行对比</p>
            <p className="text-[12px] text-[#64748B]">查看文件变更、统计与 diff</p>
          </div>
        </div>
      </div>
    </div>
  )
}
