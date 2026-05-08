/** Backend API type definitions - matches FastAPI Pydantic schemas */

export interface AgentResponse {
  id: string
  name: string
  slug: string
  type: 'local' | 'remote'
  status: 'online' | 'offline' | 'busy' | 'error'
  endpoint: string | null
  capabilities: string[]
  description: string | null
  icon: string | null
  color: string | null
  total_tasks: number
  success_rate: number
  avg_duration_ms: number
  last_active_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentCreate {
  name: string
  slug: string
  type: 'local' | 'remote'
  endpoint?: string
  api_key?: string
  capabilities?: string[]
  description?: string
  icon?: string
  color?: string
  config?: Record<string, unknown>
}

export interface AgentUpdate {
  name?: string
  endpoint?: string
  api_key?: string
  capabilities?: string[]
  description?: string
  icon?: string
  color?: string
  config?: Record<string, unknown>
}

export interface AgentInvokeRequest {
  task_description: string
  input_variables?: Record<string, unknown>
  model_config?: {
    temperature?: number
    max_tokens?: number
    top_p?: number
  }
}

export interface AgentInvokeResponse {
  output: string
  tokens_used: number
  duration_ms: number
  status: string
}

export interface AgentTestResponse {
  status: 'connected' | 'failed'
  message?: string
  latency_ms?: number
}

export interface WorkflowNodeDef {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface WorkflowEdgeDef {
  id: string
  source: string
  target: string
  label?: string
  type?: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  slug: string
  description: string | null
  version: string
  definition: {
    nodes: WorkflowNodeDef[]
    edges: WorkflowEdgeDef[]
  }
  status: 'draft' | 'published' | 'archived'
  is_template: boolean
  trigger_type: string | null
  trigger_config: Record<string, unknown>
  run_count: number
  success_count: number
  fail_count: number
  created_at: string
  updated_at: string
}

export interface WorkflowCreate {
  name: string
  slug: string
  description?: string
  definition: {
    nodes: WorkflowNodeDef[]
    edges: WorkflowEdgeDef[]
  }
  trigger_type?: string
  trigger_config?: Record<string, unknown>
}

export interface WorkflowRunRequest {
  inputs?: Record<string, unknown>
}

export interface WorkflowRunResponse {
  run_id: string
  status: string
  message: string
}

export interface WorkflowRunDetail {
  id: string
  workflow_id: string
  thread_id: string
  status: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  error: Record<string, unknown> | null
  created_at: string
}

export interface WorkflowValidationResult {
  valid: boolean
  errors: string[]
  node_count: number
  edge_count: number
}

export interface NodeExecutionResponse {
  id: string
  run_id: string
  node_id: string
  agent_id: string | null
  agent_name: string | null
  status: string
  inputs: Record<string, unknown> | null
  outputs: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  error: Record<string, unknown> | null
  retry_count: number
}

export interface ArtifactResponse {
  id: string
  name: string
  path: string
  mime_type: string | null
  size_bytes: number | null
  version: number
  run_id: string | null
  agent_id: string | null
  created_at: string
}

export interface SystemMetrics {
  cpu_percent: number
  memory_percent: number
  memory_used_mb: number
  memory_total_mb: number
  disk_usage_percent: number
  load_average: number[]
}

export interface AgentMetrics {
  agent_id: string
  agent_name: string
  avg_response_time_ms: number
  task_count: number
  error_rate: number
}

export interface WorkflowStats {
  total_workflows: number
  total_runs: number
  runs_by_status: Record<string, number>
}

export interface AppSettings {
  app_name: string
  app_version: string
  log_level: string
  workflow_max_execution_time: number
  workflow_default_timeout: number
  workflow_max_retries: number
  agent_health_check_interval: number
  agent_request_timeout: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface ApiError {
  detail: string
  status_code: number
}
