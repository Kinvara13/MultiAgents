import { motion } from 'framer-motion'

interface MarkdownPreviewProps {
  content: string
  fileName: string
}

export default function MarkdownPreview({ content, fileName }: MarkdownPreviewProps) {
  // Simple markdown-to-HTML converter for demo
  const html = content
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-[#F1F5F9] mb-4 mt-2 font-display">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-[#F1F5F9] mb-3 mt-4 font-display">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-[#F1F5F9] mb-2 mt-3 font-display">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#F1F5F9]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-[#94A3B8]">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="text-[13px] font-mono bg-[#1A2234] text-[#00D4FF] px-1.5 py-0.5 rounded">$1</code>')
    .replace(/^- (.*$)/gim, '<li class="text-[#94A3B8] ml-4 mb-1">$1</li>')
    .replace(/^\|(.+)\|$/gim, (match) => {
      const cells = match.slice(1, -1).split('|').map(c => c.trim())
      const isHeader = cells.some(c => c.includes('---'))
      if (isHeader) return ''
      return `<tr>${cells.map(c => `<td class="px-3 py-2 text-sm text-[#94A3B8] border-b border-[rgba(148,163,184,0.08)]">${c}</td>`).join('')}</tr>`
    })
    .replace(/^(?!<[hlt]|$)(.*$)/gim, '<p class="text-sm text-[#94A3B8] mb-2 leading-relaxed">$1</p>')
    .replace(/<tr>.*<\/tr>/g, (match) => `<table class="w-full text-left mb-4 border border-[rgba(148,163,184,0.08)] rounded-lg overflow-hidden">${match}</table>`)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]">
        <span className="text-xs text-[#64748B] font-mono">{fileName}</span>
        <span className="text-[10px] px-2 py-0.5 bg-[#1A2234] rounded text-[#94A3B8]">markdown</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-[680px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
