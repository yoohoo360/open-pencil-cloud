import {
  getLazyFigImportContext,
  isLazyFigImportRootPopulated,
  listPendingLazyFigImportPages
} from '#core/kiwi/fig/lazy-import.override'
import type { SceneGraph } from '@open-pencil/scene-graph'

import type { PageLoadingProgress } from '#react/app/document/page-loading/types'

/** Count how many user pages are already populated (or all if not a lazy import). */
export function countPopulatedPages(graph: SceneGraph): { completed: number; total: number } {
  const pages = graph.getPages()
  const total = pages.length
  if (!getLazyFigImportContext(graph)) {
    return { completed: total, total }
  }
  let completed = 0
  for (const page of pages) {
    if (isLazyFigImportRootPopulated(graph, page.id)) completed++
  }
  return { completed, total }
}

export function pageLoadingFromGraph(
  graph: SceneGraph,
  detail: string | null,
  visible: boolean
): PageLoadingProgress {
  const { completed, total } = countPopulatedPages(graph)
  return { visible, completed, total, detail }
}

export function pendingPageIds(graph: SceneGraph): string[] {
  if (!getLazyFigImportContext(graph)) return []
  return listPendingLazyFigImportPages(graph)
}
