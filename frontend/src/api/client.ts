/** API Client - wraps fetch with base URL, auth, error handling */

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

class ApiError extends Error {
  status: number
  detail: string

  constructor(detail: string, status: number) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }

  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    method,
    headers,
    ...options,
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }))
    throw new ApiError(errorData.detail || response.statusText, response.status)
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T
  }

  // Handle SSE streams
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    return response as T
  }

  return response.json() as Promise<T>
}

export const api = {
  // Agents
  agents: {
    list: (params?: { type?: string; status?: string; search?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string> || {}).toString()
      return request<import('./types').PaginatedResponse<import('./types').AgentResponse>>(
        'GET', `/agents${qs ? '?' + qs : ''}`
      )
    },
    get: (id: string) => request<import('./types').AgentResponse>('GET', `/agents/${id}`),
    create: (data: import('./types').AgentCreate) =>
      request<import('./types').AgentResponse>('POST', '/agents', data),
    update: (id: string, data: import('./types').AgentUpdate) =>
      request<import('./types').AgentResponse>('PUT', `/agents/${id}`, data),
    delete: (id: string) => request<void>('DELETE', `/agents/${id}`),
    test: (id: string) => request<import('./types').AgentTestResponse>('POST', `/agents/${id}/test`),
    invoke: (id: string, data: import('./types').AgentInvokeRequest) =>
      request<import('./types').AgentInvokeResponse>('POST', `/agents/${id}/invoke`, data),
  },

  // Workflows
  workflows: {
    list: (params?: { status?: string; search?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string> || {}).toString()
      return request<import('./types').PaginatedResponse<import('./types').WorkflowDefinition>>(
        'GET', `/workflows${qs ? '?' + qs : ''}`
      )
    },
    get: (id: string) => request<import('./types').WorkflowDefinition>('GET', `/workflows/${id}`),
    create: (data: import('./types').WorkflowCreate) =>
      request<import('./types').WorkflowDefinition>('POST', '/workflows', data),
    update: (id: string, data: Partial<import('./types').WorkflowCreate>) =>
      request<import('./types').WorkflowDefinition>('PUT', `/workflows/${id}`, data),
    delete: (id: string) => request<void>('DELETE', `/workflows/${id}`),
    run: (id: string, data?: import('./types').WorkflowRunRequest) =>
      request<import('./types').WorkflowRunResponse>('POST', `/workflows/${id}/run`, data),
    validate: (id: string) =>
      request<import('./types').WorkflowValidationResult>('POST', `/workflows/${id}/validate`),
    runs: (id: string, params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string> || {}).toString()
      return request<import('./types').PaginatedResponse<import('./types').WorkflowRunDetail>>(
        'GET', `/workflows/${id}/runs${qs ? '?' + qs : ''}`
      )
    },
  },

  // Executions
  executions: {
    get: (id: string) => request<import('./types').WorkflowRunDetail>('GET', `/runs/${id}`),
    pause: (id: string) => request<{ status: string }>('POST', `/runs/${id}/pause`),
    resume: (id: string) => request<{ status: string }>('POST', `/runs/${id}/resume`),
    cancel: (id: string) => request<{ status: string }>('POST', `/runs/${id}/cancel`),
    logs: (id: string) => {
      const url = `${API_BASE}/runs/${id}/logs`
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      return new EventSource(url, { withCredentials: true })
    },
    checkpoints: (id: string) =>
      request<unknown[]>('GET', `/runs/${id}/checkpoints`),
  },

  // Artifacts
  artifacts: {
    list: (params?: { run_id?: string; agent_id?: string; mime_type?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string> || {}).toString()
      return request<import('./types').PaginatedResponse<import('./types').ArtifactResponse>>(
        'GET', `/artifacts${qs ? '?' + qs : ''}`
      )
    },
    get: (id: string) => request<import('./types').ArtifactResponse>('GET', `/artifacts/${id}`),
    content: (id: string) =>
      request<{ content: string; metadata: Record<string, unknown> }>('GET', `/artifacts/${id}/content`),
    download: (id: string) => {
      window.open(`${API_BASE}/artifacts/${id}/download`, '_blank')
    },
  },

  // Settings & Monitoring
  settings: {
    get: () => request<import('./types').AppSettings>('GET', '/settings'),
    update: (data: Partial<import('./types').AppSettings>) =>
      request<import('./types').AppSettings>('PUT', '/settings', data),
  },
  metrics: {
    agents: () => request<import('./types').AgentMetrics[]>('GET', '/metrics/agents'),
    system: () => request<import('./types').SystemMetrics>('GET', '/metrics/system'),
    workflows: () => request<import('./types').WorkflowStats>('GET', '/metrics/workflows'),
  },
  logs: (params?: { level?: string; source?: string; search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string> || {}).toString()
    return request<import('./types').PaginatedResponse<Record<string, unknown>>>(
      'GET', `/logs${qs ? '?' + qs : ''}`
    )
  },

  // WebSocket
  ws: {
    connect: (token?: string) => {
      const wsUrl = (API_BASE.replace('http', 'ws').replace('/api/v1', '') || '') + '/ws'
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token: token || 'anonymous' }))
      }
      return ws
    },
  },
}

export { ApiError }
export default api
