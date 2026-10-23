import { hasDocumentCapability, documentAccessStore } from '#react/app/document/access'
import {
  isAutosaveAllowed,
  noteAutosaveAfterSave,
  noteAutosaveOpenOrFocus
} from '#react/app/document/autosave-gate'
import {
  isLocalDraftAtBaseline,
  markLocalDraftBaseline
} from '#react/app/document/local-draft/baseline'
import { persistLocalDraft } from '#react/app/document/local-draft/persist'
import type { EditorStore } from '#react/app/editor/store'
import { useEffect } from 'react'

/** IndexedDB drafts on scene edits — gated by the shared autosave not-before timestamp. */
export function useLocalDraftPersist(store: EditorStore, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (!hasDocumentCapability(documentAccessStore.get(), 'edit')) return

    // Snapshot after open settles so import/open scene bumps do not write a draft.
    markLocalDraftBaseline(store)
    noteAutosaveOpenOrFocus(store)
    let lastSeenScene = store.state.sceneVersion
    let lastSavedScene = store.state.sceneVersion
    let running: Promise<void> | null = null
    let disposed = false

    const tryPersist = () => {
      if (disposed || running) return
      if (store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId) return
      if (!isAutosaveAllowed(store)) return
      if (isLocalDraftAtBaseline(store)) {
        lastSavedScene = store.state.sceneVersion
        lastSeenScene = lastSavedScene
        return
      }
      const scene = store.state.sceneVersion
      if (scene === lastSavedScene) return
      if (!store.state.documentKey?.trim()) return
      running = persistLocalDraft(store)
        .then(() => {
          lastSavedScene = scene
          markLocalDraftBaseline(store)
          noteAutosaveAfterSave(store)
        })
        .catch((error) => {
          console.warn('[LocalDraft] Persist failed', error)
        })
        .finally(() => {
          running = null
          if (!disposed && store.state.sceneVersion !== lastSavedScene) tryPersist()
        })
    }

    const unsubscribe = store.subscribe(() => {
      if (disposed) return
      if (store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId) {
        // Keep baseline in sync while open/import is still mutating the graph.
        lastSeenScene = store.state.sceneVersion
        lastSavedScene = lastSeenScene
        markLocalDraftBaseline(store)
        return
      }
      const scene = store.state.sceneVersion
      if (scene === lastSeenScene) return
      lastSeenScene = scene
      if (isLocalDraftAtBaseline(store)) {
        lastSavedScene = scene
        return
      }
      tryPersist()
    })

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      noteAutosaveOpenOrFocus(store)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, store])
}
