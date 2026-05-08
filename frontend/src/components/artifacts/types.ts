export interface ArtifactVersion {
  id: string
  version: string
  message: string
  author: string
  authorAgent: string
  timestamp: string
  changes: { added: number; removed: number; modified: number }
}

export interface ArtifactComment {
  id: string
  line: number
  author: string
  avatar: string
  content: string
  timestamp: string
  replies?: ArtifactComment[]
}

export interface FileNode {
  id: string
  name: string
  type: 'folder' | 'file'
  fileType?: string
  agent?: string
  size?: string
  createdAt?: string
  modifiedAt?: string
  content?: string
  path: string
  children?: FileNode[]
  expanded?: boolean
  versions?: ArtifactVersion[]
  comments?: ArtifactComment[]
  language?: string
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  lineNumber: number
  content: string
}

export interface ReviewFile {
  id: string
  name: string
  status: 'pending' | 'approved' | 'needs_change'
  commentCount: number
  agent: string
}
