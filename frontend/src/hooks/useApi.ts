/** Custom hooks for API data fetching with loading/error states */

import { useState, useEffect, useCallback } from 'react'
import api, { ApiError } from '@/api/client'
import type {
  AgentResponse, AgentCreate, AgentUpdate, AgentInvokeRequest,
  WorkflowDefinition,
  WorkflowRunDetail, ArtifactResponse,
  AppSettings, AgentMetrics, SystemMetrics, WorkflowStats,
  PaginatedResponse,
} from '@/api/types'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function useApiState<T>(): ApiState<T> & {
  setData: (data: T | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return { data, loading, error, setData, setLoading, setError }
}

// ─── Agents ───────────────────────────────────────────────

export function useAgents(filters?: { type?: string; status?: string; search?: string }) {
  const state = useApiState<PaginatedResponse<AgentResponse>>()

  useEffect(() => {
    let cancelled = false
    state.setLoading(true)
    api.agents.list(filters)
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [filters?.type, filters?.status, filters?.search])

  return state
}

export function useAgent(id: string | null) {
  const state = useApiState<AgentResponse>()

  useEffect(() => {
    if (!id) return
    let cancelled = false
    state.setLoading(true)
    api.agents.get(id)
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return state
}

export function useAgentMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: AgentCreate) => {
    setLoading(true); setError(null)
    try { return await api.agents.create(data) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  const update = useCallback(async (id: string, data: AgentUpdate) => {
    setLoading(true); setError(null)
    try { return await api.agents.update(id, data) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  const remove = useCallback(async (id: string) => {
    setLoading(true); setError(null)
    try { await api.agents.delete(id) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  const test = useCallback(async (id: string) => {
    setLoading(true); setError(null)
    try { return await api.agents.test(id) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  const invoke = useCallback(async (id: string, data: AgentInvokeRequest) => {
    setLoading(true); setError(null)
    try { return await api.agents.invoke(id, data) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  return { create, update, remove, test, invoke, loading, error }
}

// ─── Workflows ────────────────────────────────────────────

export function useWorkflows(filters?: { status?: string; search?: string }) {
  const state = useApiState<PaginatedResponse<WorkflowDefinition>>()

  useEffect(() => {
    let cancelled = false
    state.setLoading(true)
    api.workflows.list(filters)
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [filters?.status, filters?.search])

  return state
}

export function useWorkflow(id: string | null) {
  const state = useApiState<WorkflowDefinition>()

  useEffect(() => {
    if (!id) return
    let cancelled = false
    state.setLoading(true)
    api.workflows.get(id)
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return state
}

export function useWorkflowRuns(id: string | null) {
  const state = useApiState<PaginatedResponse<WorkflowRunDetail>>()

  useEffect(() => {
    if (!id) return
    let cancelled = false
    state.setLoading(true)
    api.workflows.runs(id)
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return state
}

export function useWorkflowMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (id: string, inputs?: Record<string, unknown>) => {
    setLoading(true); setError(null)
    try { return await api.workflows.run(id, { inputs }) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  const validate = useCallback(async (id: string) => {
    setLoading(true); setError(null)
    try { return await api.workflows.validate(id) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  const remove = useCallback(async (id: string) => {
    setLoading(true); setError(null)
    try { await api.workflows.delete(id) }
    catch (err) { const msg = err instanceof ApiError ? err.detail : String(err); setError(msg); throw err }
    finally { setLoading(false) }
  }, [])

  return { run, validate, remove, loading, error }
}

// ─── Artifacts ────────────────────────────────────────────

export function useArtifacts(filters?: { run_id?: string; agent_id?: string }) {
  const state = useApiState<PaginatedResponse<ArtifactResponse>>()

  useEffect(() => {
    let cancelled = false
    state.setLoading(true)
    api.artifacts.list(filters)
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [filters?.run_id, filters?.agent_id])

  return state
}

// ─── Settings & Monitoring ───────────────────────────────

export function useSettings() {
  const state = useApiState<AppSettings>()

  useEffect(() => {
    let cancelled = false
    state.setLoading(true)
    api.settings.get()
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return state
}

export function useAgentMetrics() {
  const state = useApiState<AgentMetrics[]>()

  useEffect(() => {
    let cancelled = false
    state.setLoading(true)
    api.metrics.agents()
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return state
}

export function useSystemMetrics() {
  const state = useApiState<SystemMetrics>()

  useEffect(() => {
    let cancelled = false
    state.setLoading(true)
    api.metrics.system()
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return state
}

export function useWorkflowStats() {
  const state = useApiState<WorkflowStats>()

  useEffect(() => {
    let cancelled = false
    state.setLoading(true)
    api.metrics.workflows()
      .then((res) => { if (!cancelled) state.setData(res) })
      .catch((err) => { if (!cancelled) state.setError(err instanceof ApiError ? err.detail : String(err)) })
      .finally(() => { if (!cancelled) state.setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return state
}
