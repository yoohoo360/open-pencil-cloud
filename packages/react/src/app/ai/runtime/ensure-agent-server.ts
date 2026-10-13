import { IS_BROWSER } from '@open-pencil/core/constants'

/** Rspack middleware path — lazy-starts LangGraph on first page chat probe. */
export const AGENT_SERVER_ENSURE_PATH = '/__openpencil-agent-server/ensure'

function isLocalAgentServerUrl(apiUrl: string): boolean {
  try {
    const url = new URL(apiUrl)
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  } catch {
    return false
  }
}

/**
 * Ask the rspack dev server to start the Agent Server if needed.
 * No-op outside DEV / browser, or when the configured URL is not local.
 */
export async function ensureDevAgentServer(
  apiUrl: string,
  options?: { signal?: AbortSignal }
): Promise<boolean> {
  if (!IS_BROWSER || !import.meta.env.DEV) return false
  if (!isLocalAgentServerUrl(apiUrl)) return false

  try {
    const response = await fetch(AGENT_SERVER_ENSURE_PATH, {
      method: 'POST',
      signal: options?.signal,
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) return false
    const body = (await response.json().catch(() => null)) as { ok?: boolean } | null
    return body?.ok === true
  } catch {
    return false
  }
}
