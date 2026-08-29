import { IS_TAURI } from '@open-pencil/core/constants'

import type { ChatProviderSettings } from '#react/app/ai/chat/settings'
import { chatCompletionsURL } from '#react/app/ai/chat/url'

export type ProviderConnectionTestResult =
  | { ok: true }
  | { ok: false; reason: ProviderConnectionTestFailureReason }

export type ProviderConnectionTestFailureReason =
  | 'missing-api-key'
  | 'missing-base-url'
  | 'missing-model'
  | 'invalid-base-url'
  | 'auth'
  | 'insufficient-credit'
  | 'model-not-found'
  | 'api-type'
  | 'browser-network'
  | 'network'
  | 'unknown'

const CREDIT_PHRASES = [
  'insufficient credit',
  'insufficient balance',
  'insufficient quota',
  'credit balance',
  'payment required',
  'quota exceeded',
  'billing quota',
  'top up',
  'top-up'
] as const

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}

function isInsufficientCredit(status: number | null, text: string): boolean {
  if (status === 402) return true
  return CREDIT_PHRASES.some((phrase) => text.includes(phrase))
}

function validateSettings(
  settings: ChatProviderSettings
): ProviderConnectionTestFailureReason | null {
  if (!settings.apiKey.trim()) return 'missing-api-key'
  if (!settings.baseURL.trim()) return 'missing-base-url'
  try {
    const url = new URL(settings.baseURL.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'invalid-base-url'
  } catch {
    return 'invalid-base-url'
  }
  if (!settings.model.trim()) return 'missing-model'
  return null
}

function classifyStatus(
  status: number | null,
  text: string
): ProviderConnectionTestFailureReason | null {
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'model-not-found'
  if (status !== 400 && status !== 405) return null
  if (text.includes('model')) return 'model-not-found'
  if (text.includes('responses') || text.includes('chat') || text.includes('endpoint')) {
    return 'api-type'
  }
  return null
}

function classifyMessage(text: string): ProviderConnectionTestFailureReason | null {
  if (
    text.includes('api key') ||
    text.includes('authentication') ||
    text.includes('unauthorized')
  ) {
    return 'auth'
  }
  if (text.includes('model') && (text.includes('not found') || text.includes('does not exist'))) {
    return 'model-not-found'
  }
  if (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('load failed')
  ) {
    return IS_TAURI ? 'network' : 'browser-network'
  }
  if (text.includes('connection') || text.includes('network') || text.includes('timeout')) {
    return 'network'
  }
  return null
}

function classifyFailure(
  status: number | null,
  text: string
): ProviderConnectionTestFailureReason {
  if (isInsufficientCredit(status, text)) return 'insufficient-credit'
  return classifyStatus(status, text) ?? classifyMessage(text) ?? 'unknown'
}

export async function testProviderConnection(
  settings: ChatProviderSettings
): Promise<ProviderConnectionTestResult> {
  const invalidReason = validateSettings(settings)
  if (invalidReason) return { ok: false, reason: invalidReason }

  const url = chatCompletionsURL(settings.baseURL)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Reply with OK.' }]
      }),
      signal: AbortSignal.timeout(15_000)
    })
    if (response.ok) return { ok: true }
    const body = await response.text()
    return { ok: false, reason: classifyFailure(response.status, body.toLowerCase()) }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, reason: 'network' }
    }
    return { ok: false, reason: classifyFailure(null, errorText(error).toLowerCase()) }
  }
}
