import { persistCloudSceneGraph } from '#react/app/document/cloud-document'
import { hasDocumentCapability, documentAccessStore } from '#react/app/document/access'
import { maybeRecordAutosave } from '#react/app/document/version-history/record'
import type { EditorStore } from '#react/app/editor/store'
import { documentAPI } from '#react/lib/client'
import { useEffect } from 'react'

import { renderCoverThumbnail } from '@open-pencil/core/io'

const FIG_AUTOSAVE_DEBOUNCE_MS = 3_000
const COVER_AUTOSAVE_INTERVAL_MS = 3 * 60 * 1_000

async function persistCloudFig(store: EditorStore): Promise<void> {
  const remoteURL = store.state.documentFigURL
  if (!remoteURL || store.state.historyPreviewId) return
  const { bytes, binaries } = await persistCloudSceneGraph(store)
  void maybeRecordAutosave(store, bytes, binaries)
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

export function useCloudDocumentPersist(store: EditorStore, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (!hasDocumentCapability(documentAccessStore.get(), 'edit')) return

    let lastSeenScene = store.state.sceneVersion
    let lastSavedScene = store.state.sceneVersion
    let lastCoverAt = 0
    let figTimer: ReturnType<typeof setTimeout> | undefined
    let running: Promise<void> | null = null
    let disposed = false

    const flush = () => {
      if (disposed || running) return
      const scene = store.state.sceneVersion
      if (scene === lastSavedScene) return
      if (!store.state.documentFigURL || store.state.historyPreviewId) return
      running = (async () => {
        await persistCloudFig(store)
        lastSavedScene = scene
        if (Date.now() - lastCoverAt >= COVER_AUTOSAVE_INTERVAL_MS) {
          if (await saveCloudCover(store)) lastCoverAt = Date.now()
        }
      })()
        .catch((error) => {
          console.warn('[Document] Cloud autosave failed', error)
        })
        .finally(() => {
          running = null
          if (!disposed && store.state.sceneVersion !== lastSavedScene) schedule()
        })
    }

    const schedule = () => {
      if (figTimer !== undefined) clearTimeout(figTimer)
      figTimer = setTimeout(flush, FIG_AUTOSAVE_DEBOUNCE_MS)
    }

    const unsubscribe = store.subscribe(() => {
      if (disposed) return
      const scene = store.state.sceneVersion
      if (scene === lastSeenScene) return
      lastSeenScene = scene
      schedule()
    })

    return () => {
      disposed = true
      unsubscribe()
      if (figTimer !== undefined) clearTimeout(figTimer)
    }
  }, [enabled, store])
}
