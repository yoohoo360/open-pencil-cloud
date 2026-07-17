import type { UndoManager } from '@open-pencil/scene-graph'

const BATCH_IDLE_MS = 300

export function useUndoBatch(undo: UndoManager) {
  let batchKey: string | null = null
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  function commitActiveBatch() {
    if (batchKey !== null) {
      undo.commitBatch()
      batchKey = null
    }
  }

  function cancelFlush() {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  function scheduleFlush() {
    cancelFlush()
    timeoutId = setTimeout(commitActiveBatch, BATCH_IDLE_MS)
  }

  function flush() {
    cancelFlush()
    commitActiveBatch()
  }

  function ensure(key: string, label: string) {
    if (batchKey !== key) {
      flush()
      undo.beginBatch(label)
      batchKey = key
    }
    scheduleFlush()
  }

  return { ensure, flush }
}
