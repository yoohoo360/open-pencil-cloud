import { persistCloudSceneGraph } from '#react/app/document/cloud-document'
import { hasDocumentCapability, documentAccessStore } from '#react/app/document/access'
import { withDocumentBusy } from '#react/app/document/busy/store'
import { yieldToUI } from '#react/app/document/fig'
import { clearLocalDraftAfterCloudSave } from '#react/app/document/local-draft/persist'
import { maybeRecordAutosave } from '#react/app/document/version-history/record'
import type { EditorStore } from '#react/app/editor/store'
import { dialogMessages } from '#react/i18n/messages'
import { documentAPI } from '#react/lib/client'
import { useEffect } from 'react'

import { renderCoverThumbnail } from '@open-pencil/core/io'

/** Timed cloud FIG upload interval (manual save also persists immediately). */
const CLOUD_SAVE_INTERVAL_MS = 3 * 60 * 1_000
const COVER_SAVE_INTERVAL_MS = 3 * 60 * 1_000

const lastCloudPersistedScene = new WeakMap<EditorStore, number>()

/** Call after a successful cloud FIG write so the timer does not re-upload the same scene. */
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
  const bytes = await persistCloudSceneGraph(store)
  markCloudDocumentPersisted(store)
  void maybeRecordAutosave(store, bytes)
  // Cloud is authoritative — drop the local draft so open won't re-prompt.
  void clearLocalDraftAfterCloudSave(store).catch((error) => {
    console.warn('[LocalDraft] Clear after cloud save failed', error)
  })
}

export async function saveCloudCover(store: EditorStore): Promise<boolean> {
  const key = store.state.documentKey
  const renderer = store.renderer
  if (!key || store.state.historyPreviewId || !renderer) return false
  const pageId = store.graph.getPages()[0]?.id ?? store.state.currentPageId ?? store.graph.rootId
  const bytes = renderCoverThumbnail(renderer.ck, renderer, store.graph, pageId)
  if (!bytes) return false
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  await documentAPI.updateThumbnail(key, new File([copy], 'thumbnail.png', { type: 'image/png' }))
  return true
}

/**
 * Timed cloud API persist only. Scene edits debounce to IndexedDB via
 * `useLocalDraftPersist`; field changes never trigger this hook.
 * Manual Save still persists immediately through `saveFigFile`.
 */
export function useCloudDocumentPersist(store: EditorStore, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (!hasDocumentCapability(documentAccessStore.get(), 'edit')) return

    // Treat the opened scene as already synced until the user edits.
    if (lastCloudPersistedScene.get(store) === undefined) {
      lastCloudPersistedScene.set(store, store.state.sceneVersion)
    }

    let lastCoverAt = 0
    let running: Promise<void> | null = null
    let disposed = false

    const flush = () => {
      if (disposed || running) return
      if (store.state.loading || store.state.pageLoading.visible) return
      if (!cloudDocumentNeedsPersist(store)) return

      running = (async () => {
        await withDocumentBusy(dialogMessages.get().autosavingDocument, async () => {
          await yieldToUI()
          await persistCloudFig(store)
          if (Date.now() - lastCoverAt >= COVER_SAVE_INTERVAL_MS) {
            if (
              await withDocumentBusy(dialogMessages.get().savingThumbnail, () => saveCloudCover(store))
            ) {
              lastCoverAt = Date.now()
            }
          }
        })
      })()
        .catch((error) => {
          console.warn('[Document] Timed cloud save failed', error)
        })
        .finally(() => {
          running = null
        })
    }

    const interval = setInterval(flush, CLOUD_SAVE_INTERVAL_MS)

    return () => {
      disposed = true
      clearInterval(interval)
    }
  }, [enabled, store])
}
