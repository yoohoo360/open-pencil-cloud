export function messageFromProviderBody(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string } | string
      message?: string
    }
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim()
    if (
      parsed.error &&
      typeof parsed.error === 'object' &&
      typeof parsed.error.message === 'string' &&
      parsed.error.message.trim()
    ) {
      return parsed.error.message.trim()
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim()
  } catch {
    // Use the raw body when the provider did not return JSON.
  }
  return trimmed.slice(0, 280)
}

export function throwChatHttpError(status: number, body: string): never {
  const message = messageFromProviderBody(body) || `HTTP ${status}`
  const error = new Error(message)
  const lower = message.toLowerCase()
  if (status === 402 || lower.includes('credit')) {
    error.name = 'insufficient-credit'
  } else if (status === 413 || lower.includes('max_tokens')) {
    error.name = 'output-limit'
  } else if (lower.includes('does not support image') || lower.includes('unsupported-image')) {
    error.name = 'vision-unsupported'
  } else {
    error.name = 'request-failed'
  }
  throw error
}

export function failureReasonFromError(error: unknown): ChatFailureName {
  const name = error instanceof Error ? error.name : ''
  if (name === 'insufficient-credit') return 'insufficient-credit'
  if (name === 'output-limit') return 'output-limit'
  if (name === 'vision-unsupported') return 'vision-unsupported'
  return 'request-failed'
}

type ChatFailureName = 'insufficient-credit' | 'output-limit' | 'vision-unsupported' | 'request-failed'
