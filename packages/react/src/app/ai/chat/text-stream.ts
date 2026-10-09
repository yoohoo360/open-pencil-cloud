import { throwChatHttpError } from '#react/app/ai/chat/provider-error'
import { chatCompletionsURL } from '#react/app/ai/chat/url'

type ApiChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** Plain SSE chat completion (no tools). Used for plan/route phases. */
export async function streamTextCompletion(options: {
  apiKey: string
  baseURL: string
  model: string
  messages: ApiChatMessage[]
  signal?: AbortSignal
  onDelta: (text: string, reasoning: string) => void
}): Promise<{ text: string; reasoning: string }> {
  const response = await fetch(chatCompletionsURL(options.baseURL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      stream: true,
      temperature: 0.2,
      messages: options.messages
    }),
    signal: options.signal
  })

  if (!response.ok) {
    throwChatHttpError(response.status, await response.text())
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Streaming is unavailable.')

  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let reasoning = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string
              reasoning_content?: string
              reasoning?: string
            }
          }>
        }
        const delta = json.choices?.[0]?.delta
        const piece = delta?.content ?? ''
        if (piece) full += piece
        const reasoningPiece = delta?.reasoning_content ?? delta?.reasoning ?? ''
        if (reasoningPiece) reasoning += reasoningPiece
        if (piece || reasoningPiece) options.onDelta(full, reasoning)
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  return { text: full, reasoning }
}
