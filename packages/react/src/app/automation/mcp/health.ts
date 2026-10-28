import { AUTOMATION_HTTP_PORT, IS_TAURI } from '@open-pencil/core/constants'

import { desktopInvoke } from '#react/app/desktop/bridge'

export interface MCPHealthProbe {
  ok: boolean
  version: string | null
  serverStatus: string | null
}

const BROWSER_HEALTH_URL = `http://127.0.0.1:${AUTOMATION_HTTP_PORT}/health`

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Probe local MCP `/health`.
 * On desktop (Tauri or Electron), always use the native command — an https:// webview
 * cannot fetch http://127.0.0.1 (mixed content). In the browser, fetch the local server directly.
 */
export async function probeMCPHealth(): Promise<MCPHealthProbe> {
  if (IS_TAURI) {
    try {
      const result = await desktopInvoke<{
        ok: boolean
        version?: string | null
        serverStatus?: string | null
      }>('mcp_health')
      return {
        ok: result.ok,
        version: result.version ?? null,
        serverStatus: result.serverStatus ?? null
      }
    } catch {
      return { ok: false, version: null, serverStatus: null }
    }
  }

  try {
    const response = await fetch(BROWSER_HEALTH_URL, {
      signal: AbortSignal.timeout(1000)
    })
    if (!response.ok) return { ok: false, version: null, serverStatus: null }
    const payload: unknown = await response.json()
    if (!isRecord(payload)) return { ok: true, version: null, serverStatus: null }
    return {
      ok: true,
      version: typeof payload.version === 'string' ? payload.version : null,
      serverStatus: typeof payload.status === 'string' ? payload.status : null
    }
  } catch {
    return { ok: false, version: null, serverStatus: null }
  }
}
