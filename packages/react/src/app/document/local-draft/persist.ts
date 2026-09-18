import { removeLocalDraft, writeLocalDraft } from '#react/app/document/local-draft/idb'
import type { EditorStore } from '#react/app/editor/store'

import { exportFigFile } from '@open-pencil/core/io'

/** Export the live graph as .fig and store it in IndexedDB under the file key. */
export async function persistLocalDraft(store: EditorStore): Promise<void> {
  const key = store.state.documentKey?.trim()
  if (!key || store.state.historyPreviewId) return
  const figBytes = await exportFigFile(
    store.graph,
    store.renderer?.ck,
    store.renderer ?? undefined,
    store.state.currentPageId,
    false,
    { reuseOriginalArchive: false }
  )
  if (figBytes.byteLength === 0) return
  await writeLocalDraft({
    key,
    documentName: store.state.documentName?.trim() || 'Untitled',
    savedAt: new Date().toISOString(),
    sceneVersion: store.state.sceneVersion,
    figBytes
  })
}

/**
 * Cloud save is authoritative — clear the local draft so the next open does not
 * keep prompting against a stale IndexedDB copy.
 */
export async function clearLocalDraftAfterCloudSave(store: EditorStore): Promise<void> {
  const key = store.state.documentKey?.trim()
  if (!key) return
  await removeLocalDraft(key)
}
