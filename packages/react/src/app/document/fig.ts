import type { EditorStore } from '#react/app/editor/store'

import { parseFigFile, readFigFile, type ParseFigFileOptions } from '@open-pencil/core/io'
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
  store.setLoading(true)
}

function figReadOptions(store: EditorStore): ParseFigFileOptions {
  return {
    populate: 'first-page',
    // Keep the lazy FIG context on the editor graph for faster page switches.
    useWorker: false,
    onPages: (pages) => {
      showFigPageManifest(store, pages)
    }
  }
}

export async function readFigDocument(
  source: File | ArrayBuffer,
  store: EditorStore
): Promise<SceneGraph> {
  await yieldToUI()
  const options = figReadOptions(store)
  const graph =
    source instanceof File ? await readFigFile(source, options) : await parseFigFile(source, options)
  await yieldToUI()
  return graph
}
