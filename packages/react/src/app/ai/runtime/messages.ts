import type { BaseMessage } from '@langchain/core/messages'

import type { ChatMessage, ChatMessagePart } from '#react/app/ai/chat/types'

function messageText(content: BaseMessage['content']): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (typeof block === 'string') return block
      if (block && typeof block === 'object' && 'text' in block) {
        return String((block as { text?: unknown }).text ?? '')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function messageRole(message: BaseMessage): 'user' | 'assistant' {
  const type =
    typeof message.getType === 'function'
      ? message.getType()
      : String((message as { type?: string }).type ?? 'ai')
  return type === 'human' || type === 'user' ? 'user' : 'assistant'
}

/** Map LangChain / Agent Server messages into OpenPencil chat bubbles. */
export function langChainMessagesToChat(messages: readonly BaseMessage[]): ChatMessage[] {
  return messages.map((message, index) => {
    const role = messageRole(message)
    const text = messageText(message.content)
    const parts: ChatMessagePart[] = text ? [{ type: 'text', text }] : []
    const id =
      (typeof message.id === 'string' && message.id) ||
      `lc-${role}-${index}-${text.slice(0, 12)}`
    return { id, role, parts }
  })
}
