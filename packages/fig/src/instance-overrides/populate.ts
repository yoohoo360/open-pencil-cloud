import type { SceneGraph } from '@open-pencil/scene-graph'

import { nowMs } from './utils'

/**
 * Resumable instance-expansion state. Pages are expanded lazily, and a page can
 * hold thousands of instances, so the walk is driven in wall-clock slices
 * instead of one long block that would freeze the host.
 */
export interface PopulateInstancesJob {
  queue: string[]
  /** Next queue slot to inspect. */
  index: number
  visited: Set<string>
  /** Roots the caller asked for; absent when the whole graph is swept. */
  roots?: Iterable<string>
  done: boolean
}

function collectSubtreeIds(graph: SceneGraph, rootIds: Iterable<string>): Set<string> {
  const result = new Set<string>()
  const queue = [...rootIds]
  let index = 0
  while (index < queue.length) {
    const id = queue[index]
    index++
    if (result.has(id)) continue
    result.add(id)
    const node = graph.getNode(id)
    if (node) queue.push(...node.childIds)
  }
  return result
}

function ensurePopulated(graph: SceneGraph, nodeId: string, visiting: Set<string>): void {
  const node = graph.getNode(nodeId)
  if (node?.type !== 'INSTANCE' || !node.componentId || node.childIds.length > 0) return
  if (visiting.has(nodeId)) return
  visiting.add(nodeId)

  const comp = graph.getNode(node.componentId)
  if (!comp) return

  // Instances must be populated bottom-up: if an instance's source is itself an
  // unpopulated instance, populate the source first so cloned children are complete.
  if (comp.type === 'INSTANCE' && comp.componentId && comp.childIds.length === 0) {
    ensurePopulated(graph, comp.id, visiting)
  }
  for (const childId of comp.childIds) {
    const child = graph.getNode(childId)
    if (child?.type === 'INSTANCE' && child.componentId && child.childIds.length === 0) {
      ensurePopulated(graph, childId, visiting)
    }
  }

  if (comp.childIds.length > 0 && node.childIds.length === 0) {
    graph.populateInstanceChildren(nodeId, node.componentId, 'fig-import')
  }
}

export function createPopulateInstancesJob(
  graph: SceneGraph,
  rootIds?: Iterable<string>
): PopulateInstancesJob {
  if (!rootIds) {
    // Whole-document sweeps are not on the lazy page path; drain them up front.
    const visiting = new Set<string>()
    for (const node of graph.nodes.values()) {
      if (node.type === 'INSTANCE' && node.componentId && node.childIds.length === 0) {
        ensurePopulated(graph, node.id, visiting)
      }
    }
    return { queue: [], index: 0, visited: new Set(), done: true }
  }
  return { queue: [...rootIds], index: 0, visited: new Set(), roots: rootIds, done: false }
}

/** Advance the walk up to `deadline`; returns true once every instance is expanded. */
export function advancePopulateInstances(
  graph: SceneGraph,
  job: PopulateInstancesJob,
  deadline: number
): boolean {
  if (job.done) return true
  const visiting = new Set<string>()
  while (job.index < job.queue.length) {
    if (nowMs() >= deadline) return false
    const nodeId = job.queue[job.index]
    job.index++
    if (!nodeId || job.visited.has(nodeId)) continue
    job.visited.add(nodeId)
    ensurePopulated(graph, nodeId, visiting)
    const node = graph.getNode(nodeId)
    if (node) job.queue.push(...node.childIds)
  }
  job.done = true
  return true
}

/** Instance ids covered by the job; undefined for whole-document sweeps. */
export function populatedInstanceIds(
  graph: SceneGraph,
  job: PopulateInstancesJob
): Set<string> | undefined {
  return job.roots ? collectSubtreeIds(graph, job.roots) : undefined
}

/**
 * Populate empty INSTANCE nodes from their source components.
 *
 * Instances must be populated bottom-up: if an instance's source is
 * itself an unpopulated instance, populate the source first so cloned
 * children are complete.
 */
export function populateInstances(
  graph: SceneGraph,
  rootIds?: Iterable<string>
): Set<string> | undefined {
  const job = createPopulateInstancesJob(graph, rootIds)
  advancePopulateInstances(graph, job, Number.POSITIVE_INFINITY)
  return populatedInstanceIds(graph, job)
}
