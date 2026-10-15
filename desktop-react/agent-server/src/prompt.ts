import { createMiddleware } from 'langchain'

/**
 * Prefer the full system prompt from the page (Settings chat / design prompt).
 * Falls back to the graph's built-in short prompt.
 */
export const systemPromptMiddleware = createMiddleware({
  name: 'OpenPencilSystemPrompt',
  wrapModelCall: async (request, handler) => {
    const configurable = (request.runtime?.configurable ?? {}) as Record<string, unknown>
    const fromClient =
      typeof configurable.systemPrompt === 'string' ? configurable.systemPrompt.trim() : ''
    const scene =
      typeof configurable.sceneContext === 'string' ? configurable.sceneContext.trim() : ''

    const base =
      fromClient ||
      (typeof request.systemPrompt === 'string'
        ? request.systemPrompt
        : typeof request.systemPrompt === 'object' &&
            request.systemPrompt &&
            'content' in request.systemPrompt &&
            typeof (request.systemPrompt as { content: unknown }).content === 'string'
          ? (request.systemPrompt as { content: string }).content
          : '')

    const parts = [base]
    if (scene) parts.push(`## Canvas context\n${scene}`)
    const systemPrompt = parts.filter(Boolean).join('\n\n')
    if (!systemPrompt) return handler(request)
    return handler({ ...request, systemPrompt })
  }
})
