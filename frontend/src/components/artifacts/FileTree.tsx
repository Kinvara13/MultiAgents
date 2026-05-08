import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileImage,
  FileSpreadsheet,
  File,
} from 'lucide-react'
import type { FileNode } from './types'

interface FileTreeProps {
  nodes: FileNode[]
  selectedId: string | null
  onSelect: (node: FileNode) => void
  searchQuery: string
}

function getFileIcon(fileType: string | undefined) {
  switch (fileType) {
    case 'js':
    case 'ts':
    case 'py':
      return FileCode
    case 'md':
    case 'txt':
      return FileText
    case 'json':
    case 'yaml':
      return FileJson
    case 'png':
    case 'jpg':
    case 'svg':
      return FileImage
    case 'csv':
      return FileSpreadsheet
    default:
      return File
  }
}

function getFileIconColor(fileType: string | undefined): string {
  switch (fileType) {
    case 'js':
    case 'ts':
    case 'py':
      return 'text-[#F59E0B]'
    case 'md':
    case 'txt':
      return 'text-[#3B82F6]'
    case 'json':
    case 'yaml':
      return 'text-[#10B981]'
    case 'html':
    case 'css':
      return 'text-[#EF4444]'
    case 'png':
    case 'jpg':
    case 'svg':
      return 'text-[#8B5CF6]'
    case 'csv':
      return 'text-[#00D4FF]'
    default:
      return 'text-[#64748B]'
  }
}

interface TreeNodeProps {
  node: FileNode
  depth: number
  selectedId: string | null
  onSelect: (node: FileNode) => void
  searchQuery: string
}

function TreeNode({ node, depth, selectedId, onSelect, searchQuery }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(node.expanded ?? false)
  const isSelected = selectedId === node.id
  const isFolder = node.type === 'folder'
  const FileIcon = getFileIcon(node.fileType)
  const iconColor = getFileIconColor(node.fileType)

  const matchesSearch = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
    : true

  const childMatches = searchQuery && isFolder
    ? node.children?.some((child) =>
        child.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : false

  const shouldShow = matchesSearch || childMatches || !searchQuery

  const toggleExpand = useCallback(() => {
    if (isFolder) setExpanded((prev) => !prev)
  }, [isFolder])

  const handleSelect = useCallback(() => {
    if (isFolder) {
      toggleExpand()
    }
    onSelect(node)
  }, [isFolder, node, onSelect, toggleExpand])

  if (!shouldShow && searchQuery) return null

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleSelect}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-[13px] transition-colors duration-150 ${
          isSelected
            ? 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF]'
            : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F1F5F9]'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {isSelected && (
          <div className="absolute left-0 w-[2px] h-4 bg-[#00D4FF] rounded-r" />
        )}
        {isFolder && (
          <span onClick={(e) => { e.stopPropagation(); toggleExpand() }} className="flex items-center">
            {expanded ? (
              <ChevronDown size={12} className="text-[#64748B]" />
            ) : (
              <ChevronRight size={12} className="text-[#64748B]" />
            )}
          </span>
        )}
        {!isFolder && <span className="w-3" />}
        {isFolder ? (
          expanded ? (
            <FolderOpen size={14} className="text-[#F59E0B] shrink-0" />
          ) : (
            <Folder size={14} className="text-[#F59E0B] shrink-0" />
          )
        ) : (
          <FileIcon size={14} className={`${iconColor} shrink-0`} />
        )}
        <span className="truncate select-none">{node.name}</span>
        {node.agent && (
          <span className="ml-auto text-[10px] text-[#64748B] bg-[rgba(148,163,184,0.08)] px-1.5 py-0.5 rounded">
            {node.agent}
          </span>
        )}
      </motion.div>

      <AnimatePresence>
        {isFolder && expanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                searchQuery={searchQuery}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FileTree({ nodes, selectedId, onSelect, searchQuery }: FileTreeProps) {
  return (
    <div className="py-2">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  )
}
