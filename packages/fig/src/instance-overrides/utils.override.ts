import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

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
