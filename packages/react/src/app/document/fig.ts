import { readFigDocumentCached } from '#react/app/document/fig-parse-cache'
import type { FigParseCacheIdentity } from '#react/app/document/fig-parse-cache/types'
import { readPreferredPageIds } from '#react/app/document/page-frequency'
import { loadFont } from '#react/app/editor/fonts'
import type { EditorStore } from '#react/app/editor/store'

import { createEditor } from '@open-pencil/core/editor'
import type { FigPageManifestEntry } from '@open-pencil/kiwi/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

import type { ParseFigFileOptions } from '#core/io/formats/fig/read.override'

const preferPageSourceIdsByGraph = new WeakMap<SceneGraph, readonly string[]>()

export function yieldToUI(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve()
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/**
 * Wait until the browser is idle (or `timeoutMs` elapses) before starting heavy
 * background work — autosave encode, IndexedDB snapshots, cover thumbnails.
 * Prefer this over {@link yieldToUI} when the work must not contend with input/paint.
 */
export function yieldWhenIdle(timeoutMs = 3_000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const ric = window.requestIdleCallback?.bind(window)
  if (ric) {
    return new Promise((resolve) => {
      ric(() => resolve(), { timeout: timeoutMs })
    })
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * After the page graph is ready, request one paint frame.
 * Matches Vue openFigFile's `requestRender` + yield — do not wait for tiled coverage.
 */
export async function waitForCanvasPaint(store?: EditorStore): Promise<void> {
  await yieldToUI()
  if (!store) {
    await yieldToUI()
    return
  }
  store.requestRender()
  await yieldToUI()
}

/**
 * After a cold page switch, wait for the post-notify paint frame before clearing
 * the loading overlay.
 */
export async function waitForPageRenderSettled(store: EditorStore): Promise<void> {
  await yieldToUI()
  void store
}

export async function fitCurrentPageToViewport(store: EditorStore): Promise<void> {
  await yieldToUI()
  store.zoomToFit()
}

/**
 * Show lightweight page shells while a FIG worker continues decoding.
 * Not used on the main-thread first-page path — replacing the live graph with
 * empty shells flashes a blank document and looks like a failed import.
 */
export function showFigPageManifest(
  store: EditorStore,
  pages: readonly FigPageManifestEntry[]
): void {
  if (pages.length === 0) return

  const graph = new SceneGraph()
  for (const page of graph.getPages(true)) graph.deleteNode(page.id)
  for (const entry of pages) {
    const page = graph.addPage(entry.name)
    page.internalOnly = entry.internalOnly
    page.source.format = 'fig'
    page.source.id = entry.sourceId
    page.source.orderKey = entry.position
  }

  store.replaceGraph(graph)
}

/** `populate: 'all'` with optional IDB hot pages; rest drains off the open path. */
async function figReadOptions(
  signal: AbortSignal | undefined,
  extras: Pick<ParseFigFileOptions, 'useWorker'> & { documentKey?: string } = {}
): Promise<ParseFigFileOptions> {
  const documentKey = extras.documentKey?.trim() ?? ''
  const preferPageSourceIds = documentKey ? await readPreferredPageIds(documentKey) : []
  return {
    populate: 'all',
    signal,
    useWorker: extras.useWorker,
    // Always defer remaining under `all` so priority pages stay on the critical path.
    deferRemainingPages: true,
    preferPageSourceIds: preferPageSourceIds.length > 0 ? preferPageSourceIds : null
  }
}

function resolveOpenPageId(
  graph: SceneGraph,
  preferPageSourceIds: readonly string[] | null | undefined
): string {
  const pages = graph.getPages()
  for (const prefer of preferPageSourceIds ?? []) {
    const id = prefer.trim()
    if (!id) continue
    const bySource = pages.find((page) => page.source?.id === id)
    if (bySource) return bySource.id
    if (pages.some((page) => page.id === id)) return id
  }
  return pages[0]?.id ?? graph.rootId
}

export async function readFigDocument(
  source: File | ArrayBuffer,
  _store?: EditorStore,
  signal?: AbortSignal,
  extras?: Pick<ParseFigFileOptions, 'useWorker'> & {
    /** When set, try IndexedDB hydrate for this cloud document (writes are deferred). */
    cache?: FigParseCacheIdentity
    /** Cloud file key — loads top visit pages from IndexedDB into `preferPageSourceIds`. */
    documentKey?: string
  }
): Promise<SceneGraph> {
  const { cache, documentKey, ...parseExtras } = extras ?? {}
  const options = await figReadOptions(signal, { ...parseExtras, documentKey })
  const graph = await readFigDocumentCached(source, options, cache)
  preferPageSourceIdsByGraph.set(graph, options.preferPageSourceIds ?? [])
  return graph
}

/**
 * Staging prepare + swap onto the live editor.
 * Mirrors Vue `applyImportedDocument` — does not switch page or fit camera.
 */
export async function applyImportedDocument(
  store: EditorStore,
  imported: SceneGraph,
  openPageId?: string
): Promise<void> {
  // Drop PingFang slices / network fallbacks / Skia registrations from the prior file.
  await store.unloadDocumentFonts()

  const pageId = openPageId ?? imported.getPages()[0]?.id ?? imported.rootId
  // Preferred / first-page parse already materializes the open page. Re-preparing
  // through the population worker can stall the open overlay on large files.
  const { isLazyFigImportRootPopulated } = await import('#core/kiwi/fig/lazy-import.override')
  if (!isLazyFigImportRootPopulated(imported, pageId)) {
    const stagingEditor = createEditor({
      graph: imported,
      loadFont,
      skipInitialGraphSetup: true
    })
    try {
      const prepared = await stagingEditor.preparePage(pageId)
      if (!prepared) throw new Error('Imported page preparation was superseded')
    } finally {
      stagingEditor.dispose()
    }
  }

  store.replaceGraph(imported)
  store.undo.clear()
  store.clearSelection()
}

/**
 * Full open path: apply → switch preferred/first page → fit → warm until ready
 * (dismiss overlay) → idle-prefetch the rest.
 */
export async function finishFigImport(store: EditorStore, imported: SceneGraph): Promise<void> {
  const { setPageLoadingVisible, warmPagesUntilOpenReady } =
    await import('#react/app/document/page-loading/controller')
  const prefer = preferPageSourceIdsByGraph.get(imported) ?? []
  const pageId = resolveOpenPageId(imported, prefer)
  await applyImportedDocument(store, imported, pageId)

  const { pageLoadingLabels } = await import('#react/app/document/page-loading/labels')
  setPageLoadingVisible(store, true, pageLoadingLabels.preparingNodes)

  // Preferred / first pages are already populated — switch stays warm.
  await store.switchPage(pageId)
  await fitCurrentPageToViewport(store)
  store.requestRender()
  await warmPagesUntilOpenReady(store)
  const { acknowledgeDocumentSceneBaseline } = await import('#react/app/document/persist-baseline')
  acknowledgeDocumentSceneBaseline(store)
}
