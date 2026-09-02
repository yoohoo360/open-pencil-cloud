import { withTimeout } from 'es-toolkit/promise'

import type { EditorPreparationEventEmitter } from '@/app/editor/preparation/events'
import type {
  BeginEditorPreparation,
  EditorPreparationCancelReason,
  EditorPreparationFailure,
  EditorPreparationHandle,
  EditorPreparationUpdate
} from '@/app/editor/preparation/types'
import type { AppEditorState } from '@/app/editor/session/types'

const PRESENTATION_TIMEOUT_MS = 10_000

interface PresentationWaiter {
  sceneVersion: number
  resolve: () => void
}

export interface EditorPreparationControllerOptions {
  presentationTimeoutMs?: number
}

export interface EditorPreparationController {
  begin(options: BeginEditorPreparation): EditorPreparationHandle
  acknowledgePresentation(sceneVersion: number): void
  waitForPresentation(id: number, sceneVersion: number): Promise<void>
  dispose(): void
}

export function createEditorPreparationController(
  state: AppEditorState,
  events?: EditorPreparationEventEmitter,
  options: EditorPreparationControllerOptions = {}
): EditorPreparationController {
  const presentationTimeoutMs = options.presentationTimeoutMs ?? PRESENTATION_TIMEOUT_MS
  let nextId = 0
  let activeAbort: AbortController | null = null
  let activeCancel: ((reason: EditorPreparationCancelReason) => void) | null = null
  let presentedSceneVersion = -1
  const presentationWaiters = new Map<number, PresentationWaiter>()

  const isActive = (id: number) => state.preparation?.id === id

  return {
    begin(options) {
      activeCancel?.('superseded')
      const abort = new AbortController()
      activeAbort = abort
      const id = ++nextId
      const kind = options.kind
      state.preparation = {
        id,
        kind,
        phase: options.phase ?? 'reading',
        subject: options.subject ?? null,
        detail: null,
        progress: null,
        startedAt: performance.now()
      }
      events?.emit('preparation:started', state.preparation)

      const clear = () => {
        presentationWaiters.get(id)?.resolve()
        presentationWaiters.delete(id)
        if (isActive(id)) state.preparation = null
        if (activeAbort === abort) activeAbort = null
        if (activeCancel === cancel) activeCancel = null
      }

      const cancel = (reason: EditorPreparationCancelReason = 'user') => {
        if (!isActive(id)) return
        abort.abort()
        clear()
        events?.emit('preparation:finished', { id, kind, status: 'cancelled', reason })
      }
      activeCancel = cancel

      return {
        id,
        signal: abort.signal,
        update(update: EditorPreparationUpdate) {
          if (!isActive(id) || abort.signal.aborted) return
          const hasProgress =
            update.completed !== undefined &&
            update.completed !== null &&
            update.total !== undefined &&
            update.total !== null &&
            update.total > 0
          const previous = state.preparation
          if (!previous) return
          state.preparation = {
            ...previous,
            phase: update.phase,
            detail: update.detail ?? null,
            progress: hasProgress
              ? {
                  completed: update.completed ?? 0,
                  total: update.total ?? 0,
                  unit: update.unit ?? 'fonts'
                }
              : null
          }
          events?.emit('preparation:updated', state.preparation, previous)
        },
        complete() {
          if (!isActive(id)) return
          clear()
          events?.emit('preparation:finished', { id, kind, status: 'completed' })
        },
        fail(failure) {
          if (!isActive(id)) return
          const event: EditorPreparationFailure = { id, kind, ...failure }
          clear()
          events?.emit('preparation:failed', event)
        },
        cancel
      }
    },
    acknowledgePresentation(sceneVersion) {
      presentedSceneVersion = Math.max(presentedSceneVersion, sceneVersion)
      for (const [id, waiter] of presentationWaiters) {
        if (waiter.sceneVersion > presentedSceneVersion) continue
        waiter.resolve()
        presentationWaiters.delete(id)
      }
    },
    waitForPresentation(id, sceneVersion) {
      if (!isActive(id) || presentedSceneVersion >= sceneVersion) return Promise.resolve()
      return withTimeout(
        () =>
          new Promise<void>((resolve) => {
            presentationWaiters.set(id, { sceneVersion, resolve })
          }),
        presentationTimeoutMs
      ).finally(() => presentationWaiters.delete(id))
    },
    dispose() {
      activeCancel?.('tab-closed')
      activeAbort?.abort()
      activeAbort = null
      activeCancel = null
      for (const waiter of presentationWaiters.values()) waiter.resolve()
      presentationWaiters.clear()
      state.preparation = null
    }
  }
}
