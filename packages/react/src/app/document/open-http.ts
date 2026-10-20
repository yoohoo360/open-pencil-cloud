import {
  finishFigImport,
  readFigDocument,
  waitForCanvasPaint,
  yieldToUI
} from '#react/app/document/fig'
import {
  cancelScheduledFigParseCacheWrite,
  FIG_PARSE_CACHE_OPEN_WRITE_DELAY_MS,
  scheduleFigParseCacheWrite
} from '#react/app/document/fig-parse-cache/schedule'
import type { FigParseCacheIdentity } from '#react/app/document/fig-parse-cache/types'
import {
  setPageLoadingPhase,
  setPageLoadingVisible
} from '#react/app/document/page-loading/controller'
import { pageLoadingLabels } from '#react/app/document/page-loading/labels'
import { maybeRestoreLocalDraft } from '#react/app/document/local-draft/restore'
import { downloadOSSFig } from '#react/app/document/oss'
import { asFigObjectPath } from '#react/app/document/oss-path'
import { resolveDocumentRevision } from '#react/app/document/revision'
import type { EditorStore } from '#react/app/editor/store'
import type { PencilDocument } from '#react/lib/client'

import type { SceneGraph } from '@open-pencil/scene-graph'

export async function applyImportedGraph(store: EditorStore, imported: SceneGraph): Promise<void> {
  await finishFigImport(store, imported)
}

/** Prefer the caller's exclusive ArrayBuffer; only copy when the view is a subarray. */
function figBytesToBuffer(bytes: Uint8Array): ArrayBuffer {
  if (
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes.buffer
  }
  return bytes.slice().buffer
}

async function applyFigBytes(
  store: EditorStore,
  bytes: Uint8Array | null | undefined,
  _fileName: string,
  signal?: AbortSignal,
  cache?: FigParseCacheIdentity,
  documentKey?: string
): Promise<void> {
  if (!bytes || bytes.byteLength === 0) {
    throw new Error('Document bytes are missing or empty')
  }
  signal?.throwIfAborted()
  const key = documentKey?.trim() || store.state.documentKey?.trim() || undefined
  await finishFigImport(
    store,
    await readFigDocument(figBytesToBuffer(bytes), store, signal, {
      ...(cache ? { cache } : {}),
      ...(key ? { documentKey: key } : {})
    })
  )
}

export async function applyDocumentBytes(
  store: EditorStore,
  bytes: Uint8Array,
  fileName: string,
  signal?: AbortSignal,
  cache?: FigParseCacheIdentity
): Promise<void> {
  await applyFigBytes(store, bytes, fileName, signal, cache)
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

/**
 * Cloud `.fig` open with page-progress loading (`0/5 …`).
 * Overlay stays until the first two pages are warm, then idle-prefetches the rest.
 *
 * Asks about a newer local draft *before* downloading so we do not hold remote +
 * draft archives in memory at the same time.
 */
export async function openHttpDocument(
  store: EditorStore,
  documentMeta: PencilDocument | undefined,
  signal?: AbortSignal
): Promise<void> {
  cancelScheduledFigParseCacheWrite(store)

  const name = documentMeta?.name || 'Untitled'
  const documentKey = documentMeta?.key?.trim() ?? ''
  const documentUrl = documentMeta?.url?.trim()
    ? asFigObjectPath(documentMeta.url.trim())
    : ''
  store.state.documentName = name
  store.state.documentVersion = documentMeta?.version ?? ''
  store.state.documentKey = documentKey
  store.state.documentFigURL = documentUrl
  store.state.historyPreviewId = null
  store.notify()

  setPageLoadingPhase(store, pageLoadingLabels.loadingDocument)
  await yieldToUI()

  try {
    if (!documentUrl) {
      setPageLoadingVisible(store, false)
      return
    }

    signal?.throwIfAborted()
    // Prefer document.updated_at; fall back to version / versions API when missing.
    const { revision, updatedAt } = await resolveDocumentRevision(
      documentMeta,
      documentKey,
      signal
    )
    signal?.throwIfAborted()

    if (documentKey) {
      const draft = await maybeRestoreLocalDraft(documentKey, updatedAt)
      signal?.throwIfAborted()
      if (draft?.figBytes?.byteLength) {
        setPageLoadingPhase(store, pageLoadingLabels.loadingDocument)
        // Draft bytes may diverge from remote updatedAt — do not hydrate/write parse cache.
        await applyFigBytes(store, draft.figBytes, `${name}.fig`, signal, undefined, documentKey)
        await waitForCanvasPaint(store)
        bindCloudDocumentState(store, documentMeta, documentUrl)
        const { acknowledgeDocumentSceneBaseline } = await import(
          '#react/app/document/persist-baseline'
        )
        acknowledgeDocumentSceneBaseline(store)
        store.notify()
        return
      }
    }

    setPageLoadingPhase(store, pageLoadingLabels.loadingDocument)
    // Bust CDN/browser cache so opens get the latest .fig (not a stale public object).
    const payload = await downloadOSSFig(documentUrl, revision)
    signal?.throwIfAborted()
    setPageLoadingPhase(store, pageLoadingLabels.loadingDocument)

    const cache: FigParseCacheIdentity | undefined =
      documentKey && updatedAt !== undefined ? { documentKey, updatedAt } : undefined

    if (payload.byteLength > 0) {
      await applyFigBytes(store, payload, `${name}.fig`, signal, cache, documentKey)
      await waitForCanvasPaint(store)
    } else {
      setPageLoadingVisible(store, false)
    }
    bindCloudDocumentState(store, documentMeta, documentUrl)
    const { acknowledgeDocumentSceneBaseline } = await import(
      '#react/app/document/persist-baseline'
    )
    acknowledgeDocumentSceneBaseline(store)
    // After the open overlay is gone, write the parse cache off the critical path.
    if (cache) {
      scheduleFigParseCacheWrite(store, cache, FIG_PARSE_CACHE_OPEN_WRITE_DELAY_MS)
    }
    store.notify()
  } catch (error) {
    setPageLoadingVisible(store, false)
    throw error
  }
}
