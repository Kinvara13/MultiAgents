import { motion } from 'framer-motion'

interface ImagePreviewProps {
  src: string
  fileName: string
}

export default function ImagePreview({ src, fileName }: ImagePreviewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]">
        <span className="text-xs text-[#64748B] font-mono">{fileName}</span>
        <span className="text-[10px] px-2 py-0.5 bg-[#1A2234] rounded text-[#94A3B8]">image</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-[#0A0E17]">
        <motion.img
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          src={src}
          alt={fileName}
          className="max-w-full max-h-full rounded-lg shadow-card hover:scale-[1.02] transition-transform duration-300"
        />
      </div>
    </div>
  )
}
