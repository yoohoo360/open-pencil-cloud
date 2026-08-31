import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

export interface LayerSelectionMode {
  additive: boolean
  range: boolean
}

export function layerChildren(graph: SceneGraph, id: string): SceneNode[] {
  return graph.getChildren(id).filter((child) => !child.internalOnly)
}

export function collectVisibleLayerIds(
  graph: SceneGraph,
  parentId: string,
  expandedIds: ReadonlySet<string>
): string[] {
  const ids: string[] = []
  function walk(id: string) {
    for (const child of layerChildren(graph, id)) {
      ids.push(child.id)
      if (layerChildren(graph, child.id).length > 0 && expandedIds.has(child.id)) walk(child.id)
    }
  }
  walk(parentId)
  return ids
}

export function ancestorIdsToExpand(
  graph: SceneGraph,
  selectedIds: Iterable<string>,
  pageId: string
): string[] {
  const ancestors: string[] = []
  for (const id of selectedIds) {
    let node = graph.getNode(id)
    while (node?.parentId && node.parentId !== pageId) {
      ancestors.push(node.parentId)
      node = graph.getNode(node.parentId)
    }
  }
  return ancestors
}

export function layerSelectionModeFromEvent(event: {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
}): LayerSelectionMode {
  return {
    additive: event.metaKey || event.ctrlKey,
    range: event.shiftKey
  }
}

export function layerSelectionForTarget(
  visibleIds: readonly string[],
  currentIds: ReadonlySet<string>,
  anchorId: string | null,
  targetId: string,
  mode: LayerSelectionMode
): Set<string> {
  if (!mode.range || !anchorId) {
    if (!mode.additive) return new Set([targetId])
    const next = new Set(currentIds)
    if (next.has(targetId)) next.delete(targetId)
    else next.add(targetId)
    return next
  }

  const anchorIndex = visibleIds.indexOf(anchorId)
  const targetIndex = visibleIds.indexOf(targetId)
  if (anchorIndex === -1 || targetIndex === -1) return new Set([targetId])
  const start = Math.min(anchorIndex, targetIndex)
  const end = Math.max(anchorIndex, targetIndex)
  const next = mode.additive ? new Set(currentIds) : new Set<string>()
  for (let index = start; index <= end; index++) {
    const id = visibleIds[index]
    if (id) next.add(id)
  }
  return next
}
