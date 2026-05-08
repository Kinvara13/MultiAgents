import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Bug,
  Pause,
  Square,
  Download,
  Settings,
  Minus,
  Plus,
  Save,
  Undo,
  Redo,
} from 'lucide-react'

interface ToolbarProps {
  workflowName: string
  onWorkflowNameChange: (name: string) => void
  isRunning: boolean
  isPaused: boolean
  hasChanges: boolean
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onRun: () => void
  onDebug: () => void
  onPause: () => void
  onStop: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
}

export default function Toolbar({
  workflowName,
  onWorkflowNameChange,
  isRunning,
  isPaused,
  hasChanges,
  zoom,
  onZoomIn,
  onZoomOut,
  onRun,
  onDebug,
  onPause,
  onStop,
  onSave,
  onUndo,
  onRedo,
  onExport,
}: ToolbarProps) {
  const [editingName, setEditingName] = useState(false)
  const [editValue, setEditValue] = useState(workflowName)

  const handleNameSubmit = useCallback(() => {
    if (editValue.trim()) {
      onWorkflowNameChange(editValue.trim())
    }
    setEditingName(false)
  }, [editValue, onWorkflowNameChange])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className={`
        h-12 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]
        flex items-center justify-between px-4 flex-shrink-0 z-30
        ${isRunning ? 'bg-[rgba(16,185,129,0.05)]' : ''}
      `}
    >
      {/* Left: Title + Save status */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {editingName ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit()
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="
              bg-[#151D2C] border border-[rgba(0,212,255,0.3)] rounded px-2 py-1
              text-[14px] font-medium text-[#F1F5F9] focus:outline-none
              max-w-[240px]
            "
          />
        ) : (
          <button
            onDoubleClick={() => {
              setEditValue(workflowName)
              setEditingName(true)
            }}
            className="text-[14px] font-medium text-[#F1F5F9] hover:text-[#00D4FF] transition-colors truncate max-w-[240px]"
          >
            {workflowName}
          </button>
        )}

        <span
          className={`
            text-[11px] transition-colors duration-300
            ${hasChanges ? 'text-[#F59E0B]' : 'text-[#64748B]'}
          `}
        >
          {hasChanges ? '未保存 *' : '已保存'}
        </span>

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={onUndo}
            className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-[#64748B] hover:text-[#94A3B8] transition-colors"
            title="撤销 (Ctrl+Z)"
          >
            <Undo size={14} />
          </button>
          <button
            onClick={onRedo}
            className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-[#64748B] hover:text-[#94A3B8] transition-colors"
            title="重做 (Ctrl+Shift+Z)"
          >
            <Redo size={14} />
          </button>
          <button
            onClick={onSave}
            className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-[#64748B] hover:text-[#94A3B8] transition-colors"
            title="保存 (Ctrl+S)"
          >
            <Save size={14} />
          </button>
        </div>
      </div>

      {/* Center: Run controls */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <>
            <button
              onClick={onRun}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md
                bg-[#10B981] text-[#0A0E17] text-[13px] font-medium
                hover:bg-[#059669] hover:scale-[0.98] active:scale-[0.96]
                transition-all duration-150
              "
            >
              <Play size={14} fill="currentColor" />
              <span>运行</span>
            </button>
            <button
              onClick={onDebug}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md
                border border-[rgba(148,163,184,0.15)] text-[#94A3B8] text-[13px]
                hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9]
                transition-all duration-150
              "
            >
              <Bug size={14} />
              <span>调试</span>
            </button>
          </>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={onRun}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md
                  bg-[#10B981] text-[#0A0E17] text-[13px] font-medium
                  hover:bg-[#059669] transition-all duration-150
                "
              >
                <Play size={14} fill="currentColor" />
                <span>继续</span>
              </button>
            ) : (
              <button
                onClick={onPause}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md
                  bg-[#F59E0B] text-[#0A0E17] text-[13px] font-medium
                  hover:bg-[#D97706] transition-all duration-150
                "
              >
                <Pause size={14} fill="currentColor" />
                <span>暂停</span>
              </button>
            )}
            <button
              onClick={onStop}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md
                bg-[#EF4444] text-white text-[13px] font-medium
                hover:bg-[#DC2626] transition-all duration-150
              "
            >
              <Square size={14} fill="currentColor" />
              <span>停止</span>
            </button>
          </>
        )}
      </div>

      {/* Right: Zoom + Export + Settings */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <div className="flex items-center gap-1 bg-[#151D2C] rounded-md px-1">
          <button
            onClick={onZoomOut}
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] text-[#94A3B8] transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="text-[12px] text-[#94A3B8] w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={onZoomIn}
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] text-[#94A3B8] transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          onClick={onExport}
          className="
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
            border border-[rgba(148,163,184,0.15)] text-[#94A3B8] text-[13px]
            hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9]
            transition-all duration-150
          "
        >
          <Download size={14} />
          <span>导出</span>
        </button>

        <button
          className="
            p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)]
            text-[#64748B] hover:text-[#94A3B8] transition-colors
          "
        >
          <Settings size={16} />
        </button>
      </div>
    </motion.div>
  )
}
