/** Probe a LangGraph / Agent Server health endpoint (`GET /ok`). */

const DEFAULT_TIMEOUT_MS = 1500

export const DEFAULT_AGENT_SERVER_URL = 'http://127.0.0.1:2024'

export async function probeAgentServer(
  apiUrl: string,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<boolean> {
  const base = apiUrl.trim().replace(/\/+$/, '')
  if (!base) return false
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
