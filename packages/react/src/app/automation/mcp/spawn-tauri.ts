import { AUTOMATION_HTTP_PORT, IS_TAURI } from '@open-pencil/core/constants'

import { resolveLocalMCPAuthToken } from '#react/app/automation/mcp/auth-token'
import {
  disabledMCPTools,
  mcpAuthenticationEnabled,
  mcpRootDirectory
} from '#react/app/automation/mcp/preferences'

const MCP_APP_ATTACH_TIMEOUT_MS = 30_000
const HEALTH_URL = `http://127.0.0.1:${AUTOMATION_HTTP_PORT}/health`

export type TauriMCPSpawnResult =
  | { ok: true; authToken: string | null }
  | { ok: false; error: string }

async function resolveHomeDir(): Promise<string> {
  const { homeDir } = await import('@tauri-apps/api/path')
  const home = await homeDir()
  if (!home) throw new Error('Could not resolve the home directory')
  return home
}

async function healthOk(authToken: string | null): Promise<boolean> {
  try {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined
    const response = await fetch(HEALTH_URL, {
      headers,
      signal: AbortSignal.timeout(1000)
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Start (or attach to) the local MCP HTTP server from the React Tauri shell.
 * Uses the Settings-generated bearer when authentication is on.
 * Native `mcp_start` resolves PATH, local binaries, or the workspace Bun entry —
 * no global `@open-pencil/mcp` install required when developing from this repo.
 */
export async function spawnTauriMCP(): Promise<TauriMCPSpawnResult> {
  if (!IS_TAURI) return { ok: false, error: 'Not running in the desktop shell' }

  const storedToken = resolveLocalMCPAuthToken()
  const authenticationEnabled = mcpAuthenticationEnabled.get() && Boolean(storedToken)
  const authToken = authenticationEnabled ? storedToken : null

  if (await healthOk(authToken)) {
    return { ok: true, authToken }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const lookup = await invoke<{ available: boolean; path: string | null; searched: string[] }>(
      'mcp_lookup'
    )
    if (!lookup.available) {
      return {
        ok: false,
        error:
          'MCP server was not found. From desktop-react run `bun run start:mcp`, or install @open-pencil/mcp globally and restart.'
      }
    }

    const mcpRoot = mcpRootDirectory.get().trim() || (await resolveHomeDir())
    await invoke('mcp_start', {
      env: {
        PORT: String(AUTOMATION_HTTP_PORT),
        OPENPENCIL_MCP_AUTH_TOKEN: authToken ?? '',
        OPENPENCIL_MCP_CORS_ORIGIN: window.location.origin,
        OPENPENCIL_MCP_TCP: '1',
        OPENPENCIL_MCP_ROOT: mcpRoot,
        OPENPENCIL_MCP_APP_TIMEOUT_MS: String(MCP_APP_ATTACH_TIMEOUT_MS),
        OPENPENCIL_MCP_DISABLED_TOOLS: disabledMCPTools.get().join(','),
        OPENPENCIL_MCP_SCOPE: 'document'
      }
    })

    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 400)
      })
      if (await healthOk(authToken)) return { ok: true, authToken }
    }
    return { ok: false, error: 'MCP server started but did not become healthy in time' }
  } catch (reason) {
    return {
      ok: false,
      error: reason instanceof Error ? reason.message : String(reason)
    }
  }
}
