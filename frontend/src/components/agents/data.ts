export type AgentStatus = 'online' | 'offline' | 'busy'
export type AgentType = 'local' | 'remote'

export interface Task {
  id: string
  name: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  startTime?: string
  duration?: string
}

export interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  iconBg: string
  capabilities: string[]
  connection: string
  version: string
  tasksCompleted: number
  successRate: number
  avgDuration: string
  lastActive: string
  recentTasks: Task[]
  enabled: boolean
  heartbeat?: string
  description: string
}
