import {
  finishFigImport,
  readFigDocument,
  waitForCanvasPaint,
  yieldToUI,
  ensureMinimumDuration,
  loadingDurationForBytes
} from '#react/app/document/fig'
import { maybeRestoreLocalDraft } from '#react/app/document/local-draft/restore'
import { downloadOSSFig } from '#react/app/document/oss'
import { asFigObjectPath } from '#react/app/document/oss-path'
import type { EditorStore } from '#react/app/editor/store'
import type { PencilDocument } from '#react/lib/client'

import type { SceneGraph } from '@open-pencil/scene-graph'

export async function applyImportedGraph(store: EditorStore, imported: SceneGraph): Promise<void> {
  await finishFigImport(store, imported)
}

async function applyFigBytes(
  store: EditorStore,
  bytes: Uint8Array,
  _fileName: string
): Promise<void> {
  // Exact copy — avoid File([arrayBuffer]) pitfalls with offset views.
  const copy = bytes.slice()
  await finishFigImport(store, await readFigDocument(copy.buffer, store))
}

export async function applyDocumentBytes(
  store: EditorStore,
  bytes: Uint8Array,
  fileName: string
): Promise<void> {
  await applyFigBytes(store, bytes, fileName)
}

function bindCloudDocumentState(
  store: EditorStore,
  documentMeta: PencilDocument | undefined,
  documentUrl: string
): void {
  store.state.documentName = documentMeta?.name || store.state.documentName || 'Untitled'
  store.state.documentVersion = documentMeta?.version ?? store.state.documentVersion ?? ''
  store.state.documentKey = documentMeta?.key?.trim() ?? ''
  store.state.documentFigURL = asFigObjectPath(documentUrl)
  store.state.historyPreviewId = null
}

export async function openHttpDocument(
  store: EditorStore,
  documentMeta: PencilDocument | undefined
): Promise<void> {
  const name = documentMeta?.name || 'Untitled'
  const documentKey = documentMeta?.key?.trim() ?? ''
  const documentUrl = documentMeta?.url?.trim()
    ? asFigObjectPath(documentMeta.url.trim())
    : ''
  // Bind cloud identity before download/parse so Save / autosave always target OSS,
  // even when the remote .fig is empty or fails to decode.
  store.state.documentName = name
  store.state.documentVersion = documentMeta?.version ?? ''
  store.state.documentKey = documentKey
  store.state.documentFigURL = documentUrl
  store.state.historyPreviewId = null
  store.notify()

  const startedAt = Date.now()
  store.setLoading(true)
  await yieldToUI()

  try {
    if (!documentUrl) return

    const payload = await downloadOSSFig(documentUrl)
    let figByteLength = payload.byteLength

    if (payload.byteLength > 0) {
      if (documentKey) {
        const draft = await maybeRestoreLocalDraft(documentKey, documentMeta?.updated_at)
        if (draft) {
          figByteLength = draft.figBytes.byteLength
          await applyFigBytes(store, draft.figBytes, `${name}.fig`)
        } else {
          await applyDocumentBytes(store, payload, `${name}.fig`)
        }
      } else {
        await applyDocumentBytes(store, payload, `${name}.fig`)
      }
      await waitForCanvasPaint(store)
    }
    // Re-assert identity after graph replace (imports clear remote only when unbound).
    bindCloudDocumentState(store, documentMeta, documentUrl)
    store.notify()
    // Keep overlay until first paint, then pad by .fig size (max 8s).
    await ensureMinimumDuration(startedAt, loadingDurationForBytes(figByteLength))
  } finally {
    store.setLoading(false)
  }
}
