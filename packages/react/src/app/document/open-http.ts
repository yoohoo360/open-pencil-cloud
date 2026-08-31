import type { EditorStore } from '#react/app/editor/store'
import { apiClient, type PencilDocument } from '#react/lib/client'

import { readFigFile } from '@open-pencil/core/io'
import { computeAllLayouts } from '@open-pencil/core/layout'

export async function openHttpDocument(
  store: EditorStore,
  documentMeta: PencilDocument | undefined
): Promise<void> {
  const name = documentMeta?.name || 'Untitled'
  store.state.documentName = name
  store.state.documentVersion = documentMeta?.version ?? ''
  store.state.documentFigURL = documentMeta?.url ?? ''
  store.state.loading = true
  store.notify()
  try {
    const figPath = documentMeta?.url
    if (!figPath) return

    const res = await apiClient.get<ArrayBuffer>('/api/oss/download', {
      params: { path: figPath },
      responseType: 'arraybuffer',
      timeout: 120_000
    })
    const payload = res.data
    let bytes: Uint8Array | null = null
    if (payload instanceof ArrayBuffer) {
      bytes = new Uint8Array(payload)
    } else if (payload instanceof Uint8Array) {
      bytes = payload
    }
    if (!bytes) return

    const fileBytes = new Uint8Array(bytes.byteLength)
    fileBytes.set(bytes)
    const file = new File([fileBytes.buffer], `${name}.fig`, {
      type: 'application/octet-stream'
    })
    const imported = await readFigFile(file, { populate: 'first-page' })
    const firstPageId = imported.getPages()[0]?.id
    if (firstPageId) computeAllLayouts(imported, firstPageId)
    store.replaceGraph(imported)
    store.undo.clear()
    store.clearSelection()
    const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
    await store.switchPage(pageId)
    store.zoomToFit()
  } finally {
    store.state.loading = false
    store.notify()
  }
}
