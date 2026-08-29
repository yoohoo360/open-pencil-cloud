import { atom } from 'nanostores'
import { AUTOMATION_HTTP_PORT } from '@open-pencil/core/constants'

export type MCPRuntimeStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error'

export interface MCPRuntimeState {
  status: MCPRuntimeStatus
  port: number
  version: string | null
  error: string | null
  checking: boolean
  externallyManaged: boolean
}

const HEALTH_URL = import.meta.env.DEV
  ? '/__openpencil-mcp/health'
  : `http://127.0.0.1:${AUTOMATION_HTTP_PORT}/health`

export const mcpRuntime = atom<MCPRuntimeState>({
  status: 'idle',
  port: AUTOMATION_HTTP_PORT,
  version: null,
  error: null,
  checking: false,
  externallyManaged: false
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseVersion(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export async function refreshMCPRuntime(): Promise<void> {
  const current = mcpRuntime.get()
  mcpRuntime.set({ ...current, checking: true })
  try {
    const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1000) })
    if (!response.ok) {
      mcpRuntime.set({
        ...mcpRuntime.get(),
        status: current.status === 'error' ? 'error' : 'stopped',
        version: null,
        checking: false,
        externallyManaged: false
      })
      return
    }
    const payload: unknown = await response.json()
    mcpRuntime.set({
      ...mcpRuntime.get(),
      status: 'running',
      version: isRecord(payload) ? parseVersion(payload.version) : null,
      error: null,
      checking: false,
      externallyManaged: true
    })
  } catch {
    mcpRuntime.set({
      ...mcpRuntime.get(),
      status: current.status === 'error' ? 'error' : 'stopped',
      version: null,
      checking: false,
      externallyManaged: false
    })
  }
}

export async function restartMCPRuntime(): Promise<void> {
  mcpRuntime.set({ ...mcpRuntime.get(), status: 'starting', error: null })
  await refreshMCPRuntime()
}
