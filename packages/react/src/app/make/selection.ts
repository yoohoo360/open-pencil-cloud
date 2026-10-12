import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

function isMakeRoot(node: SceneNode): boolean {
  return (
    node.type === 'FRAME' ||
    node.type === 'COMPONENT' ||
    node.type === 'COMPONENT_SET' ||
    node.type === 'INSTANCE' ||
    node.type === 'SECTION' ||
    node.type === 'GROUP'
  )
}

/** Prefer explicit frame-like roots; fall back to the raw selection. */
export function resolveMakeNodeIds(graph: SceneGraph, selectedIds: readonly string[]): string[] {
  const roots = selectedIds
    .map((id) => graph.getNode(id))
    .filter((node): node is SceneNode => node !== undefined && isMakeRoot(node))
    .map((node) => node.id)
  if (roots.length > 0) return [...new Set(roots)]
  return [...new Set(selectedIds.filter((id) => graph.getNode(id)))]
}
