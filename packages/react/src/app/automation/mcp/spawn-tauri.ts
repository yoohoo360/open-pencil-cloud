import { AUTOMATION_HTTP_PORT, IS_TAURI } from '@open-pencil/core/constants'

import { resolveLocalMCPAuthToken } from '#react/app/automation/mcp/auth-token'
import { probeMCPHealth } from '#react/app/automation/mcp/health'
import {
  disabledMCPTools,
  mcpAuthenticationEnabled,
  mcpRootDirectory
} from '#react/app/automation/mcp/preferences'
import { desktopHomeDir, desktopInvoke } from '#react/app/desktop/bridge'

export type TauriMCPSpawnResult =
  | { ok: true; authToken: string | null }
  | { ok: false; error: string }

/**
 * Start (or attach to) the local MCP HTTP server from a desktop shell (Tauri or Electron).
 * Uses the Settings-generated bearer when authentication is on.
 * Health checks go through native `mcp_health` so https:// frontends are not
 * blocked by mixed-content rules when probing http://127.0.0.1:7600.
 */
export async function spawnTauriMCP(): Promise<TauriMCPSpawnResult> {
  if (!IS_TAURI) return { ok: false, error: 'Not running in the desktop shell' }

  const storedToken = resolveLocalMCPAuthToken()
  const authenticationEnabled = mcpAuthenticationEnabled.get() && Boolean(storedToken)
  const authToken = authenticationEnabled ? storedToken : null

  if ((await probeMCPHealth(authToken)).ok) {
    return { ok: true, authToken }
  }

  try {
    const lookup = await desktopInvoke<{ available: boolean; path: string | null; searched: string[] }>(
      'mcp_lookup'
    )
    if (!lookup.available) {
      return {
        ok: false,
        error:
          'MCP server was not found. Rebuild desktop-react, run `bun run start:mcp` from desktop-electron/desktop-react, or ensure packages/mcp is available.'
      }
    }

    const mcpRoot = mcpRootDirectory.get().trim() || (await desktopHomeDir())
    await desktopInvoke('mcp_start', {
      env: {
        PORT: String(AUTOMATION_HTTP_PORT),
        OPENPENCIL_MCP_AUTH_TOKEN: authToken ?? '',
        OPENPENCIL_MCP_CORS_ORIGIN: window.location.origin,
        OPENPENCIL_MCP_TCP: '1',
        OPENPENCIL_MCP_ROOT: mcpRoot,
        // Omit APP_TIMEOUT: a packaged desktop may load a remote frontend that
        // attaches after the old 30s orphan watchdog would have killed the server.
        OPENPENCIL_MCP_DISABLED_TOOLS: disabledMCPTools.get().join(','),
        OPENPENCIL_MCP_SCOPE: 'document'
      }
    })

    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 400)
      })
      if ((await probeMCPHealth(authToken)).ok) return { ok: true, authToken }
    }
    return { ok: false, error: 'MCP server started but did not become healthy in time' }
  } catch (reason) {
    return {
      ok: false,
      error: reason instanceof Error ? reason.message : String(reason)
    }
  }
}
