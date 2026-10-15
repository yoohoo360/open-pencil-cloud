import { atom } from 'nanostores'

import { AUTOMATION_HTTP_PORT, IS_TAURI } from '@open-pencil/core/constants'

import { resolveLocalMCPAuthToken } from '#react/app/automation/mcp/auth-token'
import { probeMCPHealth } from '#react/app/automation/mcp/health'
import {
  disabledMCPTools,
  mcpAuthenticationEnabled,
  mcpRootDirectory
} from '#react/app/automation/mcp/preferences'
import { spawnTauriMCP } from '#react/app/automation/mcp/spawn-tauri'

export type MCPRuntimeStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error'

export interface MCPRuntimeState {
  status: MCPRuntimeStatus
  port: number
  version: string | null
  error: string | null
  checking: boolean
  externallyManaged: boolean
}

const DEV_MCP_RESTART_PATH = '/__openpencil/mcp/restart'
const HEALTH_POLL_ATTEMPTS = 20
const HEALTH_POLL_DELAY_MS = 250

export const mcpRuntime = atom<MCPRuntimeState>({
  status: 'idle',
  port: AUTOMATION_HTTP_PORT,
  version: null,
  error: null,
  checking: false,
  externallyManaged: false
})

function controlToken(): string | null {
  return typeof __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__ === 'string'
    ? __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__
    : null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isLocalDevFrontend(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    const { hostname, port } = window.location
    return hostname === 'localhost' || hostname === '127.0.0.1' || port === '8000'
  } catch {
    return false
  }
}

export async function refreshMCPRuntime(): Promise<void> {
  const current = mcpRuntime.get()
  mcpRuntime.set({ ...current, checking: true })
  const storedToken = resolveLocalMCPAuthToken()
  const authenticationEnabled = mcpAuthenticationEnabled.get() && Boolean(storedToken)
  const authToken = authenticationEnabled ? storedToken : null
  const health = await probeMCPHealth(authToken)
  if (!health.ok) {
    mcpRuntime.set({
      ...mcpRuntime.get(),
      status: current.status === 'error' ? 'error' : 'stopped',
      version: null,
      checking: false,
      externallyManaged: false
    })
    return
  }
  mcpRuntime.set({
    ...mcpRuntime.get(),
    status: 'running',
    version: health.version,
    error: null,
    checking: false,
    // Rspack-owned child in browser DEV; Tauri-spawned counts as managed by us.
    externallyManaged: false
  })
}

async function waitUntilRunning(): Promise<boolean> {
  for (let attempt = 0; attempt < HEALTH_POLL_ATTEMPTS; attempt++) {
    await delay(HEALTH_POLL_DELAY_MS)
    await refreshMCPRuntime()
    if (mcpRuntime.get().status === 'running') return true
  }
  return false
}

async function restartViaRspackDev(): Promise<boolean> {
  const control = controlToken()
  if (!control) return false
  const storedToken = resolveLocalMCPAuthToken()
  const authenticationEnabled = mcpAuthenticationEnabled.get() && Boolean(storedToken)
  const response = await fetch(DEV_MCP_RESTART_PATH, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${control}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      authenticationEnabled,
      authToken: storedToken,
      rootDirectory: mcpRootDirectory.get(),
      disabledTools: disabledMCPTools.get(),
      scope: 'document'
    })
  })
  return response.ok
}

/**
 * Start or restart the local MCP server.
 * Desktop (Tauri): spawn `openpencil-mcp-http` when needed.
 * Browser / local rspack DEV: ask the rspack automation plugin to (re)start the child.
 */
export async function restartMCPRuntime(): Promise<void> {
  mcpRuntime.set({
    ...mcpRuntime.get(),
    status: 'starting',
    error: null,
    checking: true,
    externallyManaged: false
  })

  try {
    if (isLocalDevFrontend()) {
      const restarted = await restartViaRspackDev()
      if (restarted && (await waitUntilRunning())) return
    }

    if (IS_TAURI) {
      const spawned = await spawnTauriMCP()
      if (!spawned.ok) {
        mcpRuntime.set({
          ...mcpRuntime.get(),
          status: 'error',
          error: spawned.error,
          checking: false
        })
        return
      }
      if (await waitUntilRunning()) return
      mcpRuntime.set({
        ...mcpRuntime.get(),
        status: 'error',
        error: 'MCP server did not become ready',
        checking: false
      })
      return
    }

    if (await waitUntilRunning()) return
    mcpRuntime.set({
      ...mcpRuntime.get(),
      status: 'error',
      error: 'MCP server is not reachable. Start the React frontend (rspack) or openpencil-mcp-http.',
      checking: false
    })
  } catch (reason) {
    mcpRuntime.set({
      ...mcpRuntime.get(),
      status: 'error',
      error: reason instanceof Error ? reason.message : String(reason),
      checking: false
    })
  }
}

/** Boot-time ensure: refresh if already up, otherwise start. */
export async function ensureMCPRuntime(): Promise<void> {
  await refreshMCPRuntime()
  if (mcpRuntime.get().status === 'running') return
  await restartMCPRuntime()
}
