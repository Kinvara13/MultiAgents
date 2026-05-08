import { motion } from 'framer-motion'
import { Download, Share2, Trash2, Archive, Tag, Clock, Bot, GitCommit, Hash } from 'lucide-react'
import type { FileNode, ArtifactVersion } from './types'

interface InfoPanelProps {
  file: FileNode | null
}

function VersionItem({ version, isLatest }: { version: ArtifactVersion; isLatest: boolean }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[rgba(148,163,184,0.06)] last:border-0">
      <GitCommit size={14} className="text-[#64748B] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono text-[#00D4FF]">{version.version}</span>
          {isLatest && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[rgba(0,212,255,0.1)] text-[#00D4FF] rounded">
              latest
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#94A3B8] truncate mt-0.5">{version.message}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-[#64748B]">{version.author}</span>
          <span className="text-[10px] text-[#64748B]">{version.timestamp}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-[#10B981]">+{version.changes.added}</span>
          <span className="text-[10px] text-[#EF4444]">-{version.changes.removed}</span>
          <span className="text-[10px] text-[#F59E0B]">~{version.changes.modified}</span>
        </div>
      </div>
    </div>
  )
}

export default function InfoPanel({ file }: InfoPanelProps) {
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-[13px] text-[#64748B]">选择一个文件查看详情</p>
      </div>
    )
  }

  return (
    <motion.div
      key={file.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="h-full overflow-auto"
    >
      <div className="p-4 space-y-5">
        {/* Basic Info */}
        <div>
          <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-[rgba(148,163,184,0.08)]">
            基本信息
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#64748B]">文件名</span>
              <span className="text-[12px] text-[#F1F5F9]">{file.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#64748B]">类型</span>
              <span className="text-[12px] text-[#F1F5F9]">{file.fileType ?? 'folder'}</span>
            </div>
            {file.size && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#64748B]">大小</span>
                <span className="text-[12px] text-[#F1F5F9]">{file.size}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#64748B]">创建</span>
              <span className="text-[12px] text-[#F1F5F9]">{file.createdAt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#64748B]">修改</span>
              <span className="text-[12px] text-[#F1F5F9]">{file.modifiedAt}</span>
            </div>
          </div>
        </div>

        {/* Generation Info */}
        {file.agent && (
          <div>
            <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-[rgba(148,163,184,0.08)]">
              生成信息
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bot size={12} className="text-[#8B5CF6]" />
                <span className="text-[12px] text-[#64748B]">生成 Agent</span>
                <span className="text-[12px] text-[#F1F5F9] ml-auto">{file.agent}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash size={12} className="text-[#00D4FF]" />
                <span className="text-[12px] text-[#64748B]">关联任务</span>
                <span className="text-[12px] text-[#F1F5F9] ml-auto">task_{file.id.slice(-4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-[#F59E0B]" />
                <span className="text-[12px] text-[#64748B]">生成耗时</span>
                <span className="text-[12px] text-[#F1F5F9] ml-auto">~2.4s</span>
              </div>
            </div>
          </div>
        )}

        {/* Versions */}
        {file.versions && file.versions.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-[rgba(148,163,184,0.08)]">
              版本历史
            </h4>
            <div className="space-y-1">
              {file.versions.map((v, i) => (
                <VersionItem key={v.id} version={v} isLatest={i === 0} />
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-[rgba(148,163,184,0.08)]">
            标签
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] px-2 py-1 bg-[rgba(0,212,255,0.08)] text-[#00D4FF] rounded flex items-center gap-1">
              <Tag size={10} />
              production
            </span>
            <span className="text-[11px] px-2 py-1 bg-[rgba(16,185,129,0.08)] text-[#10B981] rounded">
              reviewed
            </span>
            <span className="text-[11px] px-2 py-1 bg-[rgba(139,92,246,0.08)] text-[#8B5CF6] rounded">
              {file.agent?.toLowerCase() ?? 'agent'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div>
          <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-[rgba(148,163,184,0.08)]">
            操作
          </h4>
          <div className="space-y-1.5">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors">
              <Download size={14} />
              下载文件
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors">
              <Share2 size={14} />
              分享链接
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors">
              <Archive size={14} />
              归档
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] rounded transition-colors">
              <Trash2 size={14} />
              删除
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
