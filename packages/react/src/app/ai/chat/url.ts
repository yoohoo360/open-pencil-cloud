export function chatCompletionsURL(baseURL: string): string {
  const trimmed = baseURL.trim().replace(/\/$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  try {
    const url = new URL(trimmed)
    if (!url.pathname || url.pathname === '/') return `${trimmed}/v1/chat/completions`
  } catch {
    return `${trimmed}/chat/completions`
  }
  return `${trimmed}/chat/completions`
}
