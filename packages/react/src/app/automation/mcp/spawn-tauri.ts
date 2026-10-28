import { AUTOMATION_HTTP_PORT, IS_TAURI } from '@open-pencil/core/constants'

import { probeMCPHealth } from '#react/app/automation/mcp/health'
import { disabledMCPTools, mcpRootDirectory } from '#react/app/automation/mcp/preferences'
import { desktopHomeDir, desktopInvoke } from '#react/app/desktop/bridge'

export type TauriMCPSpawnResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Start (or attach to) the local MCP HTTP server from a desktop shell (Tauri or Electron).
 * Health checks go through native `mcp_health` so https:// frontends are not
 * blocked by mixed-content rules when probing http://127.0.0.1:7600.
 */
export async function spawnTauriMCP(): Promise<TauriMCPSpawnResult> {
  if (!IS_TAURI) return { ok: false, error: 'Not running in the desktop shell' }

  if ((await probeMCPHealth()).ok) {
    return { ok: true }
  }

  try {
    const lookup = await desktopInvoke<{ available: boolean; path: string | null; searched: string[] }>(
      'mcp_lookup'
    )
    if (!lookup.available) {
      return {
        ok: false,
        error:
          'MCP server was not found. Run `bun run start:mcp` from desktop-electron (or desktop-react for Tauri), or ensure packages/mcp is available.'
      }
    }

    const mcpRoot = mcpRootDirectory.get().trim() || (await desktopHomeDir())
    const disabled = disabledMCPTools.get()
    await desktopInvoke('mcp_start', {
      env: {
        PORT: String(AUTOMATION_HTTP_PORT),
        OPENPENCIL_MCP_AUTH_TOKEN: '',
        OPENPENCIL_MCP_CORS_ORIGIN: window.location.origin,
        OPENPENCIL_MCP_TCP: '1',
        OPENPENCIL_MCP_ROOT: mcpRoot,
        // Omit APP_TIMEOUT: a packaged desktop may load a remote frontend that
        // attaches after the old 30s orphan watchdog would have killed the server.
        OPENPENCIL_MCP_DISABLED_TOOLS: disabled.join(','),
        OPENPENCIL_MCP_SCOPE: 'document',
        // `eval` is availability:"eval" — must opt in or it never appears in tools/list.
        OPENPENCIL_MCP_EVAL: disabled.includes('eval') ? '' : '1'
      }
    })

    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 400)
      })
      if ((await probeMCPHealth()).ok) return { ok: true }
    }
    return { ok: false, error: 'MCP server started but did not become healthy in time' }
  } catch (reason) {
    return {
      ok: false,
      error: reason instanceof Error ? reason.message : String(reason)
    }
  }
}
