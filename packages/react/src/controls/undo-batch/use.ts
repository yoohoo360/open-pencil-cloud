import { useEffect } from 'react'

import type { UndoManager } from '@open-pencil/scene-graph'

import { useTimeoutFn } from '#react/shared/dom/hooks'

const BATCH_IDLE_MS = 300

type BatchAwareUndoManager = UndoManager & { readonly isBatching: boolean }

export function useUndoBatch(undo: UndoManager) {
  let batchKey: string | null = null

  function commitActiveBatch() {
    if (batchKey !== null) {
      undo.commitBatch()
      batchKey = null
    }
  }

  const { start: scheduleFlush, stop: cancelFlush } = useTimeoutFn(
    commitActiveBatch,
    BATCH_IDLE_MS,
    { immediate: false }
  )

  function flush() {
    cancelFlush()
    commitActiveBatch()
  }

  function ensure(key: string, label: string) {
    if (batchKey === null && (undo as BatchAwareUndoManager).isBatching) return
    if (batchKey !== key) {
      flush()
      undo.beginBatch(label)
      batchKey = key
    }
    scheduleFlush()
  }

  useEffect(() => () => {
    flush()
  }, [])

  return { ensure, flush }
}
