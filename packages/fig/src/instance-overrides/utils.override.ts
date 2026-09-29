import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import type { InstanceNodeChange } from './types.override'

/** Monotonic clock for budgeted work; shared so every stage slices identically. */
export function nowMs(): number {
  return globalThis.performance?.now() ?? Date.now()
}

/** Deadline for a wall-clock slice; a non-finite budget means "run to completion". */
export function sliceDeadline(budgetMs: number): number {
  return Number.isFinite(budgetMs) ? nowMs() + budgetMs : Number.POSITIVE_INFINITY
}

export function* overrideCandidates(
  graph: SceneGraph,
  activeNodeIds?: Set<string>
): Iterable<SceneNode> {
  if (!activeNodeIds) {
    yield* graph.getAllNodes()
    return
  }
  for (const id of activeNodeIds) {
    const node = graph.getNode(id)
    if (node) yield node
  }
}

/**
 * INSTANCE NodeChanges whose graph ids are already present (and, when scoped,
 * inside the active page subtree). Prefer this over walking the full changeMap.
 */
export function collectActiveInstanceEntries(
  changeMap: Map<string, InstanceNodeChange>,
  guidToNodeId: Map<string, string>,
  nodeIdToGuid: Map<string, string>,
  activeNodeIds?: Set<string>
): Array<[string, InstanceNodeChange]> {
  const result: Array<[string, InstanceNodeChange]> = []
  if (!activeNodeIds) {
    for (const [figmaId, nc] of changeMap) {
      if (nc.type !== 'INSTANCE' || !guidToNodeId.has(figmaId)) continue
      result.push([figmaId, nc])
    }
    return result
  }
  for (const nodeId of activeNodeIds) {
    const figmaId = nodeIdToGuid.get(nodeId)
    if (!figmaId) continue
    const nc = changeMap.get(figmaId)
    if (!nc || nc.type !== 'INSTANCE') continue
    result.push([figmaId, nc])
  }
  return result
}
