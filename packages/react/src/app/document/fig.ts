import type { EditorStore } from '#react/app/editor/store'

import { computeAllLayouts } from '@open-pencil/core/layout'
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
 * After the page graph is ready, wait for one paint of the current page.
 * Do not wait for full tiled coverage — that multiplies renders and slows open.
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
 * the loading overlay. One rAF is enough — a second frame previously re-painted
 * the full page under loading and added hundreds of ms.
 */
export async function waitForPageRenderSettled(store: EditorStore): Promise<void> {
  await yieldToUI()
  void store
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

function figReadOptions(): ParseFigFileOptions {
  return {
    populate: 'first-page',
    // Keep the lazy FIG context on the editor graph for faster page switches.
    // Main-thread parse avoids empty onPages shells and worker delta cost.
    useWorker: false
  }
}

export async function readFigDocument(
  source: File | ArrayBuffer,
  _store: EditorStore
): Promise<SceneGraph> {
  const options = figReadOptions()
  const graph =
    source instanceof File ? await readFigFile(source, options) : await parseFigFile(source, options)
  return graph
}

/** Replace the store graph with an imported FIG and warm the active page. */
export async function finishFigImport(store: EditorStore, imported: SceneGraph): Promise<void> {
  const firstPageId = imported.getPages().find((page) => !page.internalOnly)?.id
  if (firstPageId) {
    try {
      // Detached import graph — layout before editor listeners attach.
      imported.runSilentMutations(() => computeAllLayouts(imported, firstPageId))
    } catch (error) {
      console.warn('[FigImport] layout after import failed', error)
    }
  }
  store.replaceGraph(imported)
  store.undo.clear()
  store.clearSelection()
  const pageId =
    store.graph.getPages().find((page) => !page.internalOnly)?.id ?? store.graph.rootId
  // switchPage fits the camera for a populated first page; avoid a second
  // zoomToFit/requestRender that re-paints the whole UI under loading.
  await store.switchPage(pageId)
  // Background-warm remaining pages so later clicks are usually instant.
  store.prefetchRemainingLazyFigPages?.()
}
