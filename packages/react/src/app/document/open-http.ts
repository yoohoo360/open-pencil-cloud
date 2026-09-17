import { finishFigImport, readFigDocument, waitForCanvasPaint, yieldToUI } from '#react/app/document/fig'
import { restoreCloudSceneGraph } from '#react/app/document/cloud-document'
import { downloadOSSObject } from '#react/app/document/oss'
import { looksLikeSceneGraphJson } from '#react/app/document/scene-graph-json'
import type { EditorStore } from '#react/app/editor/store'
import type { PencilDocument } from '#react/lib/client'

import type { SceneGraph } from '@open-pencil/scene-graph'

export async function applyImportedGraph(store: EditorStore, imported: SceneGraph): Promise<void> {
  await finishFigImport(store, imported)
}

async function applyFigBytes(
  store: EditorStore,
  bytes: Uint8Array,
  fileName: string
): Promise<void> {
  const fileBytes = new Uint8Array(bytes.byteLength)
  fileBytes.set(bytes)
  const file = new File([fileBytes.buffer], fileName, {
    type: 'application/octet-stream'
  })
  await finishFigImport(store, await readFigDocument(file, store))
}

export async function applyDocumentBytes(
  store: EditorStore,
  bytes: Uint8Array,
  fileName: string,
  options?: { sourceUrl?: string }
): Promise<void> {
  if (looksLikeSceneGraphJson(bytes)) {
    const documentUrl = options?.sourceUrl ?? store.state.documentFigURL
    if (!documentUrl) throw new Error('No cloud document URL')
    await applyImportedGraph(store, await restoreCloudSceneGraph(bytes, documentUrl))
    return
  }
  await applyFigBytes(store, bytes, fileName)
}

export async function openHttpDocument(
  store: EditorStore,
  documentMeta: PencilDocument | undefined
): Promise<void> {
  const name = documentMeta?.name || 'Untitled'
  store.state.documentName = name
  store.state.documentVersion = documentMeta?.version ?? ''
  store.state.documentKey = documentMeta?.key ?? ''
  store.state.historyPreviewId = null
  store.setLoading(true)
  await yieldToUI()
  try {
    const figPath = documentMeta?.url
    if (!figPath) return
    store.state.documentFigURL = figPath
    const payload = await downloadOSSObject(figPath)
    if (payload.byteLength === 0) return
    await applyDocumentBytes(store, payload, `${name}.fig`)
    await waitForCanvasPaint(store)
  } finally {
    store.setLoading(false)
  }
}
