import {
  getLazyFigImportContext,
  isLazyFigImportRootPopulated
} from '#core/kiwi/fig/lazy-import.override'
import type { SceneGraph } from '@open-pencil/scene-graph'

/** Count the live subtree under `rootId` (including the root). */
export function countGraphSubtreeNodes(graph: SceneGraph, rootId: string): number {
  const root = graph.getNode(rootId)
  if (!root) return 0
  let count = 0
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (!id) continue
    count++
    const node = graph.getNode(id)
    if (node) stack.push(...node.childIds)
  }
  return count
}

/** Count kiwi NodeChange descendants under a canvas (create-side estimate). */
export function countChangeMapSubtree(
  childrenMap: Map<string, string[]>,
  rootNcId: string
): number {
  let count = 0
  const stack = [rootNcId]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const id = stack.pop()
    if (!id || seen.has(id)) continue
    seen.add(id)
    count++
    const kids = childrenMap.get(id)
    if (kids) stack.push(...kids)
  }
  // Exclude the canvas root itself — only content nodes are "created" under it.
  return Math.max(0, count - 1)
}

/**
 * Nodes leaving the current page (destroy) + nodes expected for the target
 * page (create). Used only to size the cold-switch overlay duration.
 */
export function estimatePageSwitchNodeWork(
  graph: SceneGraph,
  fromPageId: string | null | undefined,
  toPageId: string
): { destroy: number; create: number; total: number } {
  const destroy = fromPageId ? countGraphSubtreeNodes(graph, fromPageId) : 0

  let create = 0
  if (isLazyFigImportRootPopulated(graph, toPageId)) {
    create = countGraphSubtreeNodes(graph, toPageId)
  } else {
    const lazy = getLazyFigImportContext(graph)
    const page = graph.getNode(toPageId)
    const canvasId =
      typeof page?.source.id === 'string' && page.source.id.length > 0 ? page.source.id : null
    if (lazy?.childrenMap && canvasId) {
      create = countChangeMapSubtree(lazy.childrenMap, canvasId)
    } else {
      create = countGraphSubtreeNodes(graph, toPageId)
    }
  }

  return { destroy, create, total: destroy + create }
}
