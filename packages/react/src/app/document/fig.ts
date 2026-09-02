import type { EditorStore } from '#react/app/editor/store'

import { parseFigFile, readFigFile, type ParseFigFileOptions } from '@open-pencil/core/io'
import { computeAllLayouts, sortNodesInReadingOrder } from '@open-pencil/core/layout'
import type { FigPageManifestEntry } from '@open-pencil/kiwi/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

export function yieldToUI(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve()
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/** Show lightweight page shells while the FIG worker continues decoding the home page. */
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
  store.state.loading = true
  store.notify()
}

function paintPriorityFigGraph(store: EditorStore, graph: SceneGraph, partial: boolean): void {
  store.replaceGraph(graph)
  store.undo.clear()
  store.clearSelection()
  store.state.loading = true
  const pageId = graph.getPages()[0]?.id
  if (pageId) {
    const first = sortNodesInReadingOrder(graph.getChildren(pageId))[0]
    if (first) computeAllLayouts(graph, first.id)
  }
  store.notify()
  if (partial) store.zoomToFit()
}

function figReadOptions(store: EditorStore): ParseFigFileOptions {
  let fitted = false
  return {
    populate: 'first-page',
    onPages: (pages) => showFigPageManifest(store, pages),
    onGraph: (graph, info) => {
      paintPriorityFigGraph(store, graph, info.partial && !fitted)
      if (info.partial) fitted = true
    }
  }
}

export function readFigDocument(source: File | ArrayBuffer, store: EditorStore) {
  const options = figReadOptions(store)
  if (source instanceof File) return readFigFile(source, options)
  return parseFigFile(source, options)
}
