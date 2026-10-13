import type { ChatMessage } from '#react/app/ai/chat/types'

/** In-memory transcript per document tab so multi-turn context survives tab switches. */
const byTab = new Map<string, ChatMessage[]>()

export function loadChatMemory(tabId: string): ChatMessage[] {
  const stored = byTab.get(tabId)
  return stored ? structuredClone(stored) : []
}

export function saveChatMemory(tabId: string, messages: readonly ChatMessage[]): void {
  byTab.set(tabId, structuredClone(messages as ChatMessage[]))
}

export function clearChatMemory(tabId: string): void {
  byTab.delete(tabId)
}

function userText(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

/**
 * After stop: drop a trailing empty/incomplete assistant, keep partial replies
 * marked done so the next turn still has conversation context.
 */
export function finalizeStoppedMessages(messages: readonly ChatMessage[]): ChatMessage[] {
  if (messages.length === 0) return []
  const next = [...messages]
  const last = next[next.length - 1]
  if (last?.role !== 'assistant') return next

  const hasText = last.parts.some((part) => part.type === 'text' && part.text.trim())
  const hasTools = last.parts.some((part) => part.type === 'tool')
  const hasPlan = Boolean(last.planArtifacts?.plan?.trim() || last.planArtifacts?.steps?.trim())
  if (!hasText && !hasTools && !hasPlan) {
    next.pop()
    return next
  }
  next[next.length - 1] = { ...last, phase: 'done' }
  return next
}

/**
 * Cancel / re-edit: remove trailing assistant(s) and the target user turn,
 * return its text for the composer. Defaults to the last user message.
 */
export function pullUserMessageForEdit(
  messages: readonly ChatMessage[],
  messageId?: string
): { messages: ChatMessage[]; draft: string | null } {
  const next = finalizeStoppedMessages(messages)
  let index = -1
  if (messageId) {
    index = next.findIndex((message) => message.id === messageId && message.role === 'user')
  } else {
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i]?.role === 'user') {
        index = i
        break
      }
    }
  }
  if (index < 0) return { messages: next, draft: null }
  const draft = userText(next[index])
  return { messages: next.slice(0, index), draft: draft || null }
}
