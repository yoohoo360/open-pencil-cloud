/** Probe the local companion Node service (MCP on :7600) via `GET /ok`. */

import { AUTOMATION_HTTP_PORT } from '@open-pencil/core/constants'

import { probeMCPHealth } from '#react/app/automation/mcp/health'

const DEFAULT_TIMEOUT_MS = 1500

export const DEFAULT_AGENT_SERVER_PORT = AUTOMATION_HTTP_PORT
export const DEFAULT_AGENT_SERVER_URL = `http://127.0.0.1:${AUTOMATION_HTTP_PORT}`

function isTauriShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function isLocalCompanionUrl(apiUrl: string): boolean {
  try {
    const url = new URL(apiUrl)
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return false
    const port = url.port ? Number(url.port) : AUTOMATION_HTTP_PORT
    return port === AUTOMATION_HTTP_PORT
  } catch {
    return false
  }
}

/**
 * Chat runtime badge probe. The companion is the MCP HTTP server (same Node
 * process) — desktop uses native `mcp_health` so https:// pages are not blocked.
 */
export async function probeAgentServer(
  apiUrl: string,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<boolean> {
  const base = apiUrl.trim().replace(/\/+$/, '')
  if (!base) return false

  if (isTauriShell() && isLocalCompanionUrl(base)) {
    return (await probeMCPHealth(null)).ok
  }

  // Browser on https:// must not attempt local http — avoid console noise.
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    isLocalCompanionUrl(base)
  ) {
    return false
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onOuterAbort = () => controller.abort()
  options?.signal?.addEventListener('abort', onOuterAbort, { once: true })
  try {
    const response = await fetch(`${base}/ok`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) return false
    const body = (await response.json().catch(() => null)) as { ok?: boolean } | null
    return body?.ok === true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
    options?.signal?.removeEventListener('abort', onOuterAbort)
  }
}
