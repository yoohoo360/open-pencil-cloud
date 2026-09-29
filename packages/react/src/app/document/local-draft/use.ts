import { hasDocumentCapability, documentAccessStore } from '#react/app/document/access'
import {
  isLocalDraftAtBaseline,
  markLocalDraftBaseline
} from '#react/app/document/local-draft/baseline'
import { persistLocalDraft } from '#react/app/document/local-draft/persist'
import type { EditorStore } from '#react/app/editor/store'
import { useEffect } from 'react'

const LOCAL_DRAFT_DEBOUNCE_MS = 2_000

/** Debounced IndexedDB .fig drafts — only after local scene edits (not open/import). */
export function useLocalDraftPersist(store: EditorStore, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (!hasDocumentCapability(documentAccessStore.get(), 'edit')) return

    // Snapshot after open settles so import/open scene bumps do not write a draft.
    markLocalDraftBaseline(store)
    let lastSeenScene = store.state.sceneVersion
    let lastSavedScene = store.state.sceneVersion
    let timer: ReturnType<typeof setTimeout> | undefined
    let running: Promise<void> | null = null
    let disposed = false

    const flush = () => {
      if (disposed || running) return
      if (store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId) return
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
        })
        .catch((error) => {
          console.warn('[LocalDraft] Persist failed', error)
        })
        .finally(() => {
          running = null
          if (!disposed && store.state.sceneVersion !== lastSavedScene) schedule()
        })
    }

    const schedule = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(flush, LOCAL_DRAFT_DEBOUNCE_MS)
    }

    const unsubscribe = store.subscribe(() => {
      if (disposed) return
      if (store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId) {
        // Keep baseline in sync while open/import is still mutating the graph.
        lastSeenScene = store.state.sceneVersion
        lastSavedScene = lastSeenScene
        markLocalDraftBaseline(store)
        if (timer !== undefined) {
          clearTimeout(timer)
          timer = undefined
        }
        return
      }
      const scene = store.state.sceneVersion
      if (scene === lastSeenScene) return
      lastSeenScene = scene
      if (isLocalDraftAtBaseline(store)) {
        lastSavedScene = scene
        return
      }
      schedule()
    })

    return () => {
      disposed = true
      unsubscribe()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [enabled, store])
}
