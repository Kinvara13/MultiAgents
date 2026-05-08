import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useMemo } from 'react'

interface CSVPreviewProps {
  content: string
  fileName: string
}

export default function CSVPreview({ content, fileName }: CSVPreviewProps) {
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const lines = content.trim().split('\n')
  const headers = lines[0]?.split(',').map(h => h.trim()) ?? []
  const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()))

  const sortedRows = useMemo(() => {
    if (sortColumn === null) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortColumn] ?? ''
      const bv = b[sortColumn] ?? ''
      const an = parseFloat(av)
      const bn = parseFloat(bv)
      const isNum = !isNaN(an) && !isNaN(bn)
      const cmp = isNum ? an - bn : av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortColumn, sortDir])

  const handleSort = (idx: number) => {
    if (sortColumn === idx) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(idx)
      setSortDir('asc')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]">
        <span className="text-xs text-[#64748B] font-mono">{fileName}</span>
        <span className="text-[10px] px-2 py-0.5 bg-[#1A2234] rounded text-[#94A3B8]">csv</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#111827] sticky top-0 z-10">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="px-3 py-2 text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider cursor-pointer hover:text-[#F1F5F9] border-b border-[rgba(148,163,184,0.08)]"
                >
                  <div className="flex items-center gap-1">
                    {h}
                    {sortColumn === i && (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => (
              <motion.tr
                key={ri}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: ri * 0.01 }}
                className={ri % 2 === 0 ? 'bg-transparent' : 'bg-[rgba(148,163,184,0.03)]'}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-[#94A3B8] border-b border-[rgba(148,163,184,0.04)]">
                    {cell}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
