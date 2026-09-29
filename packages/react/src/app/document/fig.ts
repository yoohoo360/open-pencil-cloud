import type { EditorStore } from '#react/app/editor/store'
import { loadFont } from '#react/app/editor/fonts'

import { createEditor } from '@open-pencil/core/editor'
import { parseFigFile, readFigFile } from '@open-pencil/core/io'
import type { ParseFigFileOptions } from '#core/io/formats/fig/read.override'
import type { FigPageManifestEntry } from '@open-pencil/kiwi/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

export function yieldToUI(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve()
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
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

/** Worker decode + first-page populate; remaining pages warm via population worker. */
function figReadOptions(
  signal?: AbortSignal,
  extras?: Pick<ParseFigFileOptions, 'useWorker'>
): ParseFigFileOptions {
  return {
    populate: 'first-page',
    signal,
    useWorker: extras?.useWorker
  }
}

export async function readFigDocument(
  source: File | ArrayBuffer,
  _store?: EditorStore,
  signal?: AbortSignal,
  extras?: Pick<ParseFigFileOptions, 'useWorker'>
): Promise<SceneGraph> {
  const options = figReadOptions(signal, extras)
  const graph =
    source instanceof File ? await readFigFile(source, options) : await parseFigFile(source, options)
  return graph
}

/**
 * Staging prepare + swap onto the live editor.
 * Mirrors Vue `applyImportedDocument` — does not switch page or fit camera.
 */
export async function applyImportedDocument(
  store: EditorStore,
  imported: SceneGraph
): Promise<void> {
  const firstPage = imported.getPages()[0]
  const pageId = firstPage?.id ?? imported.rootId
  // Worker `first-page` parse already materializes page 1. Re-preparing it through
  // the population worker can stall the open overlay for minutes on large files.
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
 * Full open path: apply → switch first page → fit → warm until 2 pages ready
 * (dismiss overlay) → idle-prefetch the rest.
 */
export async function finishFigImport(store: EditorStore, imported: SceneGraph): Promise<void> {
  const { setPageLoadingVisible, warmPagesUntilOpenReady } =
    await import('#react/app/document/page-loading/controller')
  await applyImportedDocument(store, imported)

  const firstPage = store.graph.getPages()[0]
  const pageId = firstPage?.id ?? store.graph.rootId
  const { pageLoadingLabels } = await import('#react/app/document/page-loading/labels')
  setPageLoadingVisible(store, true, pageLoadingLabels.preparingNodes)

  // First page is already populated by worker/staging — switch stays warm.
  await store.switchPage(pageId)
  await fitCurrentPageToViewport(store)
  store.requestRender()
  await warmPagesUntilOpenReady(store)
  const { acknowledgeDocumentSceneBaseline } = await import('#react/app/document/persist-baseline')
  acknowledgeDocumentSceneBaseline(store)
}
