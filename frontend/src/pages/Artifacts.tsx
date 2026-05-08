import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Copy,
  Download,
  MessageSquare,
  Maximize2,
  PanelLeftClose,
  PanelRightClose,
  PanelLeftOpen,
  PanelRightOpen,
  FileCode2,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import type { FileNode } from '@/components/artifacts/types'
import FileTree from '@/components/artifacts/FileTree'
import CodePreview from '@/components/artifacts/CodePreview'
import MarkdownPreview from '@/components/artifacts/MarkdownPreview'
import ImagePreview from '@/components/artifacts/ImagePreview'
import JSONPreview from '@/components/artifacts/JSONPreview'
import CSVPreview from '@/components/artifacts/CSVPreview'
import InfoPanel from '@/components/artifacts/InfoPanel'
import ReviewPanel from '@/components/artifacts/ReviewPanel'
import VersionTimeline from '@/components/artifacts/VersionTimeline'
import { reviewFiles } from '@/components/artifacts/mockData'
import { useArtifacts, useAgents } from '@/hooks/useApi'
import api from '@/api/client'
import type { ArtifactResponse, AgentResponse } from '@/api/types'

type TabType = 'artifacts' | 'review' | 'versions'

// ─── Helpers ───────────────────────────────────────────────

function getFileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function getLanguageFromMimeType(mimeType: string | null, fileName: string): string {
  if (!mimeType) return getFileExtension(fileName) || 'text'
  const mimeLangMap: Record<string, string> = {
    'text/javascript': 'javascript',
    'application/javascript': 'javascript',
    'text/typescript': 'typescript',
    'application/typescript': 'typescript',
    'text/x-python': 'python',
    'text/x-yaml': 'yaml',
    'application/x-yaml': 'yaml',
    'text/yaml': 'yaml',
    'application/json': 'json',
    'text/markdown': 'markdown',
    'text/x-markdown': 'markdown',
    'text/css': 'css',
    'text/html': 'html',
    'text/x-java': 'java',
    'text/x-go': 'go',
    'text/x-rust': 'rust',
    'text/x-c': 'c',
    'text/x-c++': 'cpp',
    'text/x-shellscript': 'bash',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'text/plain': 'text',
    'text/csv': 'csv',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/gif': 'image',
    'image/svg+xml': 'image',
    'image/webp': 'image',
  }
  const lang = mimeLangMap[mimeType]
  if (lang) return lang
  // Fall back to file extension
  const ext = getFileExtension(fileName)
  const extLangMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    css: 'css',
    html: 'html',
    xml: 'xml',
    csv: 'csv',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    sh: 'bash',
    sql: 'sql',
    dockerfile: 'dockerfile',
    vue: 'javascript',
    svelte: 'javascript',
  }
  return extLangMap[ext] || ext || 'text'
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log10(bytes) / 3)
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Build file tree from ArtifactResponse ─────────────────

interface TreeFolder {
  id: string
  name: string
  path: string
  children: Map<string, TreeFolder>
  files: ArtifactResponse[]
}

function buildFileTree(artifacts: ArtifactResponse[]): FileNode[] {
  const root: TreeFolder = {
    id: 'root',
    name: '',
    path: '',
    children: new Map(),
    files: [],
  }

  // Insert each artifact into the tree
  for (const artifact of artifacts) {
    const parts = artifact.path.split('/').filter(Boolean)
    if (parts.length === 0) {
      root.files.push(artifact)
      continue
    }

    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (isLast) {
        // This is the file name
        current.files.push(artifact)
      } else {
        // This is a folder
        if (!current.children.has(part)) {
          current.children.set(part, {
            id: `folder-${current.path}/${part}`.replace(/^\//, ''),
            name: part,
            path: `${current.path}/${part}`.replace(/^\//, '/') || `/${part}`,
            children: new Map(),
            files: [],
          })
        }
        current = current.children.get(part)!
      }
    }
  }

  // Convert TreeFolder to FileNode[]
  function convertFolder(folder: TreeFolder): FileNode[] {
    const nodes: FileNode[] = []

    // Add sub-folders
    for (const childFolder of folder.children.values()) {
      const children: FileNode[] = []
      // Recursively convert
      children.push(...convertFolder(childFolder))
      nodes.push({
        id: childFolder.id,
        name: childFolder.name,
        type: 'folder',
        path: childFolder.path,
        expanded: true,
        children,
      })
    }

    // Add files
    for (const artifact of folder.files) {
      const ext = getFileExtension(artifact.name)
      const lang = getLanguageFromMimeType(artifact.mime_type, artifact.name)
      nodes.push({
        id: artifact.id,
        name: artifact.name,
        type: 'file',
        fileType: ext,
        agent: artifact.agent_id ?? undefined,
        size: formatFileSize(artifact.size_bytes),
        createdAt: formatDateTime(artifact.created_at),
        modifiedAt: formatDateTime(artifact.created_at),
        path: artifact.path,
        language: lang,
        content: undefined,
      })
    }

    return nodes
  }

  return convertFolder(root)
}

function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

function getFirstFile(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node
    if (node.children) {
      const found = getFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}

// ─── Skeleton component for loading ────────────────────────

function FileTreeSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-5 bg-[rgba(148,163,184,0.06)] rounded animate-pulse"
          style={{ marginLeft: i % 3 === 0 ? 0 : 16, width: `${60 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────

export default function Artifacts() {
  const [activeTab, setActiveTab] = useState<TabType>('artifacts')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  // Fetch artifacts from API
  const artifacts = useArtifacts(
    selectedAgentId ? { agent_id: selectedAgentId } : undefined
  )

  // Fetch agents for filter dropdown
  const agents = useAgents()

  // Build file tree from API data
  const artifactTree = useMemo(() => {
    const items = artifacts.data?.items || []
    return buildFileTree(items)
  }, [artifacts.data])

  // Agent lookup map: id -> name
  const agentMap = useMemo(() => {
    const map: Record<string, string> = {}
    const items = agents.data?.items || []
    for (const a of items) {
      map[a.id] = a.name
    }
    return map
  }, [agents.data])

  // Enrich tree with agent names
  const enrichedTree = useMemo(() => {
    function enrich(nodes: FileNode[]): FileNode[] {
      return nodes.map((node) => {
        if (node.type === 'file' && node.agent && agentMap[node.agent]) {
          return { ...node, agent: agentMap[node.agent] }
        }
        if (node.children) {
          return { ...node, children: enrich(node.children) }
        }
        return node
      })
    }
    return enrich(artifactTree)
  }, [artifactTree, agentMap])

  const selectedFile = useMemo(() => {
    if (!selectedId) return null
    return findNodeById(enrichedTree, selectedId)
  }, [selectedId, enrichedTree])

  const firstFile = useMemo(() => getFirstFile(enrichedTree), [enrichedTree])

  // Fetch file content when a file is selected
  useEffect(() => {
    if (!selectedId) {
      setFileContent(null)
      return
    }
    let cancelled = false
    setContentLoading(true)
    api.artifacts.content(selectedId)
      .then((res) => {
        if (!cancelled) setFileContent(res.content)
      })
      .catch(() => {
        if (!cancelled) setFileContent(null)
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedId])

  const handleSelect = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      setSelectedId(node.id)
    }
  }, [])

  const handleCopy = useCallback(() => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent)
      toast.success('已复制到剪贴板')
    }
  }, [fileContent])

  const handleDownload = useCallback(() => {
    if (selectedFile) {
      api.artifacts.download(selectedFile.id)
    }
  }, [selectedFile])

  const tabs = [
    { key: 'artifacts' as TabType, label: '产物' },
    { key: 'review' as TabType, label: '审查' },
    { key: 'versions' as TabType, label: '版本' },
  ]

  // Loading state
  if (artifacts.loading && !artifacts.data) {
    return (
      <div className="flex flex-col h-[calc(100dvh-56px)] bg-[#0A0E17]">
        {/* Top Tab Bar */}
        <div className="flex items-center px-4 border-b border-[rgba(148,163,184,0.08)] bg-[#111827]">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-3 text-[14px] transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'text-[#F1F5F9]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="artifact-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="text-[#00D4FF] animate-spin" />
            <p className="text-[13px] text-[#64748B]">加载产物列表...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (artifacts.error) {
    return (
      <div className="flex flex-col h-[calc(100dvh-56px)] bg-[#0A0E17]">
        {/* Top Tab Bar */}
        <div className="flex items-center px-4 border-b border-[rgba(148,163,184,0.08)] bg-[#111827]">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-3 text-[14px] transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'text-[#F1F5F9]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="artifact-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-8 max-w-md text-center">
            <AlertCircle size={32} className="text-[#EF4444]" />
            <p className="text-[14px] text-[#F1F5F9] font-medium">加载失败</p>
            <p className="text-[12px] text-[#64748B]">{artifacts.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 text-[12px] bg-[rgba(0,212,255,0.1)] text-[#00D4FF] rounded-lg hover:bg-[rgba(0,212,255,0.15)] transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderPreview = () => {
    if (!selectedFile || selectedFile.type === 'folder') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <FileCode2 size={48} className="text-[rgba(148,163,184,0.15)] mb-4" />
          <p className="text-[14px] text-[#64748B] mb-1">
            {artifactTree.length === 0 ? '暂无产物' : '选择一个文件预览'}
          </p>
          <p className="text-[12px] text-[#64748B]">
            {artifactTree.length === 0 ? '当前没有可用的产物文件' : '从左侧文件树点击文件查看内容'}
          </p>
          {firstFile && !selectedId && artifactTree.length > 0 && (
            <button
              onClick={() => setSelectedId(firstFile.id)}
              className="mt-4 text-[12px] text-[#00D4FF] hover:underline"
            >
              打开第一个文件
            </button>
          )}
        </div>
      )
    }

    if (contentLoading) {
      return (
        <div className="h-full flex items-center justify-center">
          <Loader2 size={24} className="text-[#00D4FF] animate-spin" />
        </div>
      )
    }

    const lang = selectedFile.language ?? 'text'
    const content = fileContent ?? ''

    if (lang === 'markdown' || lang === 'md') {
      return <MarkdownPreview content={content} fileName={selectedFile.name} />
    }
    if (lang === 'json') {
      return <JSONPreview content={content} fileName={selectedFile.name} />
    }
    if (lang === 'yaml') {
      return <CodePreview content={content} language="yaml" fileName={selectedFile.name} />
    }
    if (lang === 'csv') {
      return <CSVPreview content={content} fileName={selectedFile.name} />
    }
    if (lang === 'image') {
      return <ImagePreview src={content} fileName={selectedFile.name} />
    }

    return <CodePreview content={content} language={lang} fileName={selectedFile.name} />
  }

  const selectedComments = selectedFile?.comments ?? []

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-[#0A0E17]">
      <Toaster position="top-center" />

      {/* Top Tab Bar */}
      <div className="flex items-center px-4 border-b border-[rgba(148,163,184,0.08)] bg-[#111827]">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-3 text-[14px] transition-colors duration-200 ${
                activeTab === tab.key
                  ? 'text-[#F1F5F9]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="artifact-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="搜索产物..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] pl-8 pr-3 py-1.5 text-[13px] bg-[#151D2C] text-[#F1F5F9] border border-[rgba(148,163,184,0.08)] rounded-lg placeholder-[#64748B] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
            />
          </div>
          {/* Agent filter dropdown */}
          <div className="relative">
            <select
              value={selectedAgentId ?? ''}
              onChange={(e) => setSelectedAgentId(e.target.value || null)}
              className="appearance-none w-[140px] pl-3 pr-7 py-1.5 text-[12px] bg-[#151D2C] text-[#F1F5F9] border border-[rgba(148,163,184,0.08)] rounded-lg focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors cursor-pointer"
            >
              <option value="">全部 Agent</option>
              {(agents.data?.items || []).map((agent: AgentResponse) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
          </div>
          <button className="p-1.5 rounded-md text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'artifacts' && (
            <motion.div
              key="artifacts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex h-full"
            >
              {/* Left: File Tree */}
              <AnimatePresence>
                {leftPanelOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-r border-[rgba(148,163,184,0.08)] bg-[#111827] overflow-hidden flex flex-col"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(148,163,184,0.08)]">
                      <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em]">
                        文件树
                        {artifacts.data && (
                          <span className="ml-1.5 text-[10px] text-[#64748B] normal-case">
                            ({artifacts.data.total})
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => setLeftPanelOpen(false)}
                        className="p-1 rounded text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      >
                        <PanelLeftClose size={14} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                      {artifacts.loading ? (
                        <FileTreeSkeleton />
                      ) : (
                        <FileTree
                          nodes={enrichedTree}
                          selectedId={selectedId}
                          onSelect={handleSelect}
                          searchQuery={searchQuery}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!leftPanelOpen && (
                <button
                  onClick={() => setLeftPanelOpen(true)}
                  className="absolute left-0 top-[56px] z-20 p-1.5 bg-[#111827] border border-[rgba(148,163,184,0.08)] rounded-r-md text-[#64748B] hover:text-[#F1F5F9] transition-colors"
                >
                  <PanelLeftOpen size={14} />
                </button>
              )}

              {/* Center: Preview */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Preview Toolbar */}
                {selectedFile && selectedFile.type === 'file' && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(148,163,184,0.08)] bg-[#111827]">
                    <span className="text-[11px] text-[#64748B] font-mono truncate">
                      {selectedFile.path}
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                        title="复制"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={handleDownload}
                        className="p-1.5 rounded text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                        title="下载"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        className="p-1.5 rounded text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-colors relative"
                        title="评论"
                      >
                        <MessageSquare size={14} />
                        {selectedFile.comments && selectedFile.comments.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#F59E0B] text-[#0A0E17] text-[9px] font-bold rounded-full flex items-center justify-center">
                            {selectedFile.comments.length}
                          </span>
                        )}
                      </button>
                      <button
                        className="p-1.5 rounded text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                        title="全屏"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview Content */}
                <div className="flex-1 overflow-hidden">
                  {renderPreview()}
                </div>

                {/* Bottom Bar */}
                {selectedFile && selectedFile.type === 'file' && (
                  <div className="flex items-center gap-4 px-4 py-1.5 border-t border-[rgba(148,163,184,0.08)] bg-[#111827]">
                    <span className="text-[11px] text-[#64748B]">
                      {selectedFile.size ?? '-'}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {selectedFile.language ?? 'text'}
                    </span>
                    {selectedFile.agent && (
                      <span className="text-[11px] text-[#64748B]">
                        by {selectedFile.agent}
                      </span>
                    )}
                    <span className="text-[11px] text-[#64748B] ml-auto">
                      修改于 {selectedFile.modifiedAt}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Info Panel */}
              <AnimatePresence>
                {rightPanelOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-l border-[rgba(148,163,184,0.08)] bg-[#111827] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(148,163,184,0.08)]">
                      <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-[0.05em]">
                        信息
                      </span>
                      <button
                        onClick={() => setRightPanelOpen(false)}
                        className="p-1 rounded text-[#64748B] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      >
                        <PanelRightClose size={14} />
                      </button>
                    </div>
                    <div className="h-[calc(100%-36px)] overflow-auto">
                      <InfoPanel file={selectedFile} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!rightPanelOpen && (
                <button
                  onClick={() => setRightPanelOpen(true)}
                  className="absolute right-0 top-[56px] z-20 p-1.5 bg-[#111827] border border-[rgba(148,163,184,0.08)] rounded-l-md text-[#64748B] hover:text-[#F1F5F9] transition-colors"
                >
                  <PanelRightOpen size={14} />
                </button>
              )}
            </motion.div>
          )}

          {activeTab === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ReviewPanel
                reviewFiles={reviewFiles}
                selectedReviewId={selectedReviewId}
                onSelectReview={setSelectedReviewId}
                comments={selectedComments}
              />
            </motion.div>
          )}

          {activeTab === 'versions' && (
            <motion.div
              key="versions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <VersionTimeline />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
