import type { SceneNode } from './types'

/** Minimal graph surface — avoid importing the facade that re-exports this module. */
type PrunableGraph = {
  rootId: string
  getNode(id: string): SceneNode | undefined
  getAllNodes(): Iterable<SceneNode>
  deleteNode(id: string): void
}

/** Node ids reachable by walking `childIds` from the document root. */
export function collectMountedNodeIds(graph: PrunableGraph): Set<string> {
  const reachable = new Set<string>()
  const stack = [graph.rootId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined || reachable.has(id)) continue
    reachable.add(id)
    const node = graph.getNode(id)
    if (!node) continue
    for (const childId of node.childIds) stack.push(childId)
  }
  return reachable
}

/**
 * Nodes present in the graph but not reachable from the document root
 * (broken parent links, detached createNodeWithId(null), stale leftovers).
 */
export function findUnmountedNodeIds(graph: PrunableGraph): string[] {
  const mounted = collectMountedNodeIds(graph)
  const orphans: string[] = []
  for (const node of graph.getAllNodes()) {
    if (!mounted.has(node.id)) orphans.push(node.id)
  }
  return orphans
}

/**
 * Delete unmounted forests. Returns every removed id (roots and descendants).
 * Safe to call when there are none.
 */
export function pruneUnmountedNodes(graph: PrunableGraph): string[] {
  const orphans = new Set(findUnmountedNodeIds(graph))
  if (orphans.size === 0) return []

  const roots = [...orphans].filter((id) => {
    const node = graph.getNode(id)
    if (!node) return false
    const parentId = node.parentId
    // Root of an orphan forest: no parent, or parent is still mounted / missing.
    return !parentId || !orphans.has(parentId)
  })

  const deleted: string[] = []
  for (const id of roots) {
    if (!graph.getNode(id)) continue
    collectSubtreeIds(graph, id, deleted)
    graph.deleteNode(id)
  }
  return deleted
}

function collectSubtreeIds(graph: PrunableGraph, rootId: string, out: string[]): void {
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined) continue
    out.push(id)
    const node = graph.getNode(id)
    if (!node) continue
    for (const childId of node.childIds) stack.push(childId)
  }
}
