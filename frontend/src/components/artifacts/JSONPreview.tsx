import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface JSONPreviewProps {
  content: string
  fileName: string
}

interface JSONValueProps {
  data: unknown
  keyName?: string
  depth?: number
}

function JSONValue({ data, keyName, depth = 0 }: JSONValueProps) {
  const [expanded, setExpanded] = useState(true)
  const indent = depth * 16

  const isObject = data !== null && typeof data === 'object'
  const isArray = Array.isArray(data)
  const entries = isObject ? Object.entries(data as Record<string, unknown>) : []

  const toggle = useCallback(() => setExpanded((p) => !p), [])

  if (!isObject) {
    let color = 'text-[#F1F5F9]'
    if (typeof data === 'string') color = 'text-[#10B981]'
    if (typeof data === 'number') color = 'text-[#F59E0B]'
    if (typeof data === 'boolean') color = 'text-[#8B5CF6]'

    return (
      <div className="flex items-start gap-1">
        {keyName && (
          <>
            <span className="text-[#00D4FF]">{keyName}</span>
            <span className="text-[#64748B]">:</span>
          </>
        )}
        <span className={color}>
          {typeof data === 'string' ? `"${data}"` : String(data)}
        </span>
      </div>
    )
  }

  const openBracket = isArray ? '[' : '{'
  const closeBracket = isArray ? ']' : '}'

  return (
    <div style={{ marginLeft: indent }}>
      <div className="flex items-center gap-1 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] rounded" onClick={toggle}>
        {entries.length > 0 && (
          expanded ? <ChevronDown size={12} className="text-[#64748B]" /> : <ChevronRight size={12} className="text-[#64748B]" />
        )}
        {entries.length === 0 && <span className="w-3" />}
        {keyName && (
          <>
            <span className="text-[#00D4FF]">{keyName}</span>
            <span className="text-[#64748B]">: </span>
          </>
        )}
        <span className="text-[#64748B]">{openBracket}</span>
        {!expanded && (
          <span className="text-[#64748B]">
            {entries.length} {isArray ? 'items' : 'keys'}
          </span>
        )}
        {!expanded && <span className="text-[#64748B]">{closeBracket}</span>}
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {entries.map(([k, v], i) => (
            <div key={k} className="ml-4">
              <JSONValue
                data={v}
                keyName={isArray ? undefined : k}
                depth={depth + 1}
              />
              {i < entries.length - 1 && (
                <span className="text-[#64748B]">,</span>
              )}
            </div>
          ))}
          <div>
            <span className="text-[#64748B]">{closeBracket}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default function JSONPreview({ content, fileName }: JSONPreviewProps) {
  const parsed = (() => {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  })()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]">
        <span className="text-xs text-[#64748B] font-mono">{fileName}</span>
        <span className="text-[10px] px-2 py-0.5 bg-[#1A2234] rounded text-[#94A3B8]">json</span>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-[#0D1117]">
        {parsed ? (
          <pre className="text-[13px] font-mono leading-[1.6]">
            <JSONValue data={parsed} />
          </pre>
        ) : (
          <pre className="text-[13px] font-mono text-[#94A3B8]">{content}</pre>
        )}
      </div>
    </div>
  )
}
