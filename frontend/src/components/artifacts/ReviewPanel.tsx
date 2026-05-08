import { motion } from 'framer-motion'
import { MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { ReviewFile, ArtifactComment } from './types'
import { diffData } from './mockData'

interface ReviewPanelProps {
  reviewFiles: ReviewFile[]
  selectedReviewId: string | null
  onSelectReview: (id: string) => void
  comments: ArtifactComment[]
}

function getStatusIcon(status: ReviewFile['status']) {
  switch (status) {
    case 'approved': return <CheckCircle size={14} className="text-[#10B981]" />
    case 'needs_change': return <XCircle size={14} className="text-[#EF4444]" />
    case 'pending': return <AlertCircle size={14} className="text-[#F59E0B]" />
  }
}

function getStatusText(status: ReviewFile['status']) {
  switch (status) {
    case 'approved': return '已通过'
    case 'needs_change': return '需修改'
    case 'pending': return '待审查'
  }
}

function DiffView() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]">
        <span className="text-xs text-[#64748B] font-mono">src/auth.js</span>
        <span className="text-[10px] px-2 py-0.5 bg-[rgba(16,185,129,0.1)] text-[#10B981] rounded">diff</span>
      </div>
      <div className="flex-1 overflow-auto bg-[#0D1117]">
        <div className="py-2">
          {diffData.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`flex items-start px-4 py-0.5 font-mono text-[13px] leading-[1.6] ${
                line.type === 'add'
                  ? 'bg-[rgba(16,185,129,0.08)]'
                  : line.type === 'remove'
                  ? 'bg-[rgba(239,68,68,0.08)]'
                  : ''
              }`}
            >
              <span className={`w-4 shrink-0 mr-3 ${
                line.type === 'add'
                  ? 'text-[#10B981]'
                  : line.type === 'remove'
                  ? 'text-[#EF4444]'
                  : 'text-[#64748B]'
              }`}>
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </span>
              <span className={`w-8 shrink-0 text-[11px] text-[#64748B] mr-3 text-right ${
                line.type === 'add'
                  ? 'text-[#10B981]'
                  : line.type === 'remove'
                  ? 'text-[#EF4444]'
                  : ''
              }`}>
                {line.lineNumber}
              </span>
              <span className={`${
                line.type === 'add'
                  ? 'text-[#10B981]'
                  : line.type === 'remove'
                  ? 'text-[#EF4444]'
                  : 'text-[#94A3B8]'
              }`}>
                {line.content}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InlineComments({ comments }: { comments: ArtifactComment[] }) {
  return (
    <div className="w-[280px] border-l border-[rgba(148,163,184,0.08)] bg-[#111827] overflow-auto">
      <div className="p-4">
        <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-3">
          行内评论
        </h4>
        <div className="space-y-3">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1A2234] rounded-lg p-3 border border-[rgba(148,163,184,0.08)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-[9px] font-bold text-[#0A0E17]">
                  {comment.avatar}
                </div>
                <span className="text-[11px] text-[#F1F5F9]">{comment.author}</span>
                <span className="text-[10px] text-[#64748B] ml-auto">第{comment.line}行</span>
              </div>
              <p className="text-[12px] text-[#94A3B8]">{comment.content}</p>
              <span className="text-[10px] text-[#64748B] mt-2 block">{comment.timestamp}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ReviewPanel({ reviewFiles, selectedReviewId, onSelectReview, comments }: ReviewPanelProps) {
  return (
    <div className="flex h-full">
      {/* File List */}
      <div className="w-[260px] border-r border-[rgba(148,163,184,0.08)] bg-[#111827] overflow-auto">
        <div className="p-3">
          <h4 className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em] mb-3 px-2">
            待审查文件
          </h4>
          <div className="space-y-1">
            {reviewFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onSelectReview(file.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selectedReviewId === file.id
                    ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF]'
                    : 'hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                {getStatusIcon(file.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#F1F5F9] truncate">{file.name}</div>
                  <div className="text-[10px] text-[#64748B]">{getStatusText(file.status)} · {file.agent}</div>
                </div>
                {file.commentCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[#F59E0B]">
                    <MessageSquare size={10} />
                    {file.commentCount}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Diff + Comments */}
      <div className="flex flex-1">
        <div className="flex-1">
          <DiffView />
        </div>
        <InlineComments comments={comments} />
      </div>
    </div>
  )
}
