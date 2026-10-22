import { persistCloudSceneGraph } from '#react/app/document/cloud-document'
import { hasDocumentCapability, documentAccessStore } from '#react/app/document/access'
import {
  isAutosaveAllowed,
  noteAutosaveAfterSave,
  noteAutosaveOpenOrFocus
} from '#react/app/document/autosave-gate'
import { yieldToUI, yieldWhenIdle } from '#react/app/document/fig'
import { clearLocalDraftAfterCloudSave } from '#react/app/document/local-draft/persist'
import { maybeRecordAutosave } from '#react/app/document/version-history/record'
import type { EditorStore } from '#react/app/editor/store'
import { documentAPI } from '#react/lib/client'
import { useEffect } from 'react'

import { renderCoverThumbnail } from '@open-pencil/core/io'

const COVER_SAVE_INTERVAL_MS = 3 * 60 * 1_000

const lastCloudPersistedScene = new WeakMap<EditorStore, number>()
const lastCoverAtByStore = new WeakMap<EditorStore, number>()

/** Call after a successful cloud FIG write so the same scene is not re-uploaded. */
export function markCloudDocumentPersisted(store: EditorStore): void {
  lastCloudPersistedScene.set(store, store.state.sceneVersion)
}

function cloudDocumentNeedsPersist(store: EditorStore): boolean {
  if (!store.state.documentFigURL?.trim() || store.state.historyPreviewId) return false
  const last = lastCloudPersistedScene.get(store)
  if (last === undefined) {
    lastCloudPersistedScene.set(store, store.state.sceneVersion)
    return false
  }
  return last !== store.state.sceneVersion
}

async function persistCloudFig(store: EditorStore): Promise<void> {
  const remoteURL = store.state.documentFigURL
  if (!remoteURL || store.state.historyPreviewId) return
  if (store.state.loading || store.state.pageLoading.visible) return
  const { bytes } = await persistCloudSceneGraph(store)
  if (store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId) return
  markCloudDocumentPersisted(store)
  noteAutosaveAfterSave(store)
  void maybeRecordAutosave(store, bytes)
  // Cloud is authoritative — drop the local draft so open won't re-prompt.
  void clearLocalDraftAfterCloudSave(store).catch((error) => {
    console.warn('[LocalDraft] Clear after cloud save failed', error)
  })
}

export async function saveCloudCover(store: EditorStore): Promise<boolean> {
  const key = store.state.documentKey
  if (!key || store.state.historyPreviewId || !store.renderer) return false
  if (store.state.loading || store.state.pageLoading.visible) return false
  // Cover encode is sync CanvasKit work — only start once the tab is idle.
  await yieldWhenIdle()
  const renderer = store.renderer
  if (!key || !renderer || store.state.historyPreviewId) return false
  if (store.state.loading || store.state.pageLoading.visible) return false
  const pageId = store.graph.getPages()[0]?.id ?? store.state.currentPageId ?? store.graph.rootId
  const bytes = renderCoverThumbnail(renderer.ck, renderer, store.graph, pageId)
  if (!bytes) return false
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  await yieldToUI()
  if (store.state.documentKey !== key || store.state.historyPreviewId) return false
  if (store.state.loading || store.state.pageLoading.visible) return false
  await documentAPI.updateThumbnail(key, new File([copy], 'thumbnail.png', { type: 'image/png' }))
  return true
}

/**
 * Cloud autosave on scene edits: compare `Date.now()` to a not-before gate
 * (no interval timer). Open / tab focus adds 1 minute; save adds 3 minutes.
 * IndexedDB drafts stay on `useLocalDraftPersist`. Manual Save uses `saveFigFile`.
 */
export function useCloudDocumentPersist(store: EditorStore, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (!hasDocumentCapability(documentAccessStore.get(), 'edit')) return

    // Treat the opened scene as already synced until the user edits.
    if (lastCloudPersistedScene.get(store) === undefined) {
      lastCloudPersistedScene.set(store, store.state.sceneVersion)
    }
    // FIG just became editable in this view — wait 1 minute.
    noteAutosaveOpenOrFocus(store)

    let running: Promise<void> | null = null
    let disposed = false

    const tryAutosave = () => {
      if (disposed || running) return
      if (store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId) return
      if (!isAutosaveAllowed(store)) return
      if (!cloudDocumentNeedsPersist(store)) return

      running = (async () => {
        await yieldWhenIdle()
        if (disposed) return
        if (store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId) return
        if (!isAutosaveAllowed(store)) return
        if (!cloudDocumentNeedsPersist(store)) return
        await persistCloudFig(store)
        if (disposed) return
        const lastCoverAt = lastCoverAtByStore.get(store) ?? 0
        if (Date.now() - lastCoverAt >= COVER_SAVE_INTERVAL_MS) {
          try {
            if (await saveCloudCover(store)) lastCoverAtByStore.set(store, Date.now())
          } catch (error) {
            console.warn('[Document] Timed cover save failed', error)
          }
        }
      })()
        .catch((error) => {
          console.warn('[Document] Cloud autosave failed', error)
        })
        .finally(() => {
          running = null
        })
    }

    const unsubscribe = store.subscribe(() => {
      if (disposed) return
      if (!cloudDocumentNeedsPersist(store)) return
      tryAutosave()
    })

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      // Back from another tab/page — wait 1 minute before autosave.
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
