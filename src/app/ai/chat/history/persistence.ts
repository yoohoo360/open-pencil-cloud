import type { UIMessage } from 'ai'
import { ref, type Ref } from 'vue'

import { fallbackTitle, snapshotMessages } from './messages'
import type { Conversation, ConversationStore } from './types'

interface PersistenceOptions {
  store: ConversationStore
  current: Ref<Conversation | null>
  messages: Ref<UIMessage[]>
  readOnly: Ref<boolean>
  content(): { messages: UIMessage[]; interrupted: boolean }
  refresh(): Promise<void>
}

/** Captures snapshots before queuing writes; failures remain visible and retryable. */
export function createHistoryPersistence(options: PersistenceOptions) {
  const storageError = ref(false)
  let writes: Promise<void> = Promise.resolve()

  function flush(): Promise<void> {
    const conversation = options.current.value
    if (!conversation || options.readOnly.value) return writes
    const content = options.content()
    if (!content.messages.length && conversation.titleSource === 'fallback') return writes
    const snapshot: Conversation = {
      ...conversation,
      title:
        conversation.titleSource === 'fallback'
          ? fallbackTitle(content.messages)
          : conversation.title,
      updatedAt: new Date().toISOString(),
      interrupted: content.interrupted,
      messages: snapshotMessages(content.messages)
    }
    options.current.value = snapshot
    options.messages.value = content.messages
    writes = writes
      .catch(() => undefined)
      .then(async () => {
        await options.store.write(snapshot)
        await options.store.select(snapshot.documentId, snapshot.id)
        storageError.value = false
        await options.refresh()
        return undefined
      })
      .catch((error) => {
        storageError.value = true
        throw error
      })
    return writes
  }

  return { flush, storageError }
}
