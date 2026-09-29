import { isEqual } from 'es-toolkit/predicate'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

export interface FigPopulationDelta {
  created: Array<[string, SceneNode]>
  updated: Array<[string, Partial<SceneNode>]>
  deleted: string[]
  instanceIndex: Array<[string, string[]]>
  populatedRootIds: string[]
}

export interface FigMutationJournal {
  before: Map<string, Partial<SceneNode>>
  created: Set<string>
  deleted: Set<string>
  stop: () => void
}

export function installFigMutationJournal(graph: SceneGraph): FigMutationJournal {
  const existingAtStart = new Set(graph.nodes.keys())
  const before = new Map<string, Partial<SceneNode>>()
  const created = new Set<string>()
  const deleted = new Set<string>()
  const original = {
    createNode: graph.createNode.bind(graph),
    createNodeWithId: graph.createNodeWithId.bind(graph),
    updateNode: graph.updateNode.bind(graph),
    deleteNode: graph.deleteNode.bind(graph)
  }
  function touch(id: string | null | undefined, fields: Iterable<keyof SceneNode>): void {
    if (!id || created.has(id)) return
    const node = graph.getNode(id)
    if (!node) return
    const snapshot = before.get(id) ?? {}
    before.set(id, snapshot)
    for (const field of fields) {
      if (!(field in snapshot)) Object.assign(snapshot, { [field]: structuredClone(node[field]) })
    }
  }
  graph.createNode = ((type, parentId, overrides) => {
    touch(parentId, ['childIds'])
    const node = original.createNode(type, parentId, overrides)
    created.add(node.id)
    return node
  }) as SceneGraph['createNode']
  graph.createNodeWithId = ((id, type, parentId, overrides) => {
    touch(parentId, ['childIds'])
    const node = original.createNodeWithId(id, type, parentId, overrides)
    created.add(node.id)
    return node
  }) as SceneGraph['createNodeWithId']
  graph.updateNode = ((id, changes) => {
    const node = graph.getNode(id)
    if (node) {
      const fields = (Object.keys(changes) as (keyof SceneNode)[]).filter(
        (field) => !isEqual(node[field], changes[field])
      )
      if (fields.length > 0) fields.push('source')
      if ('componentId' in changes) fields.push('componentId')
      if ('fills' in changes || 'strokes' in changes) fields.push('boundVariables')
      touch(id, fields)
    }
    original.updateNode(id, changes)
  }) as SceneGraph['updateNode']
  graph.deleteNode = ((id) => {
    const node = graph.getNode(id)
    touch(node?.parentId, ['childIds'])
    const pending = node ? [id] : []
    while (pending.length > 0) {
      const currentId = pending.pop()
      if (!currentId) continue
      const current = graph.getNode(currentId)
      if (current) pending.push(...current.childIds)
      if (!existingAtStart.has(currentId)) {
        created.delete(currentId)
        before.delete(currentId)
      } else deleted.add(currentId)
    }
    original.deleteNode(id)
  }) as SceneGraph['deleteNode']
  return {
    before,
    created,
    deleted,
    stop() {
      graph.createNode = original.createNode
      graph.createNodeWithId = original.createNodeWithId
      graph.updateNode = original.updateNode
      graph.deleteNode = original.deleteNode
    }
  }
}

export function buildFigPopulationDelta(
  graph: SceneGraph,
  journal: FigMutationJournal,
  populatedRootIds: Iterable<string>
): FigPopulationDelta {
  const updated: Array<[string, Partial<SceneNode>]> = []
  for (const [id, previous] of journal.before) {
    const current = graph.getNode(id)
    if (!current || journal.deleted.has(id)) continue
    const changes: Partial<SceneNode> = {}
    for (const key of Object.keys(previous) as (keyof SceneNode)[]) {
      if (!isEqual(previous[key], current[key]))
        Object.assign(changes, { [key]: structuredClone(current[key]) })
    }
    if (Object.keys(changes).length > 0) updated.push([id, changes])
  }
  const created = [...journal.created]
    .map((id) => graph.getNode(id))
    .filter((node) => node !== undefined)
    .map((node) => [node.id, structuredClone(node)] as [string, SceneNode])
  return {
    created,
    updated,
    deleted: [...journal.deleted],
    instanceIndex: [...graph.instanceIndex].map(([id, ids]) => [id, [...ids]]),
    populatedRootIds: [...populatedRootIds]
  }
}

export function applyFigPopulationDelta(graph: SceneGraph, delta: FigPopulationDelta): void {
  // Worker deltas can create/update tens of thousands of nodes. Emitting per-node
  // graph events here freezes the UI (renderer invalidation + React subscribers).
  graph.runSilentMutations(() => {
    graph.preserveSourceMetadataDuring(() => {
      for (const [, node] of delta.created) {
        graph.createNodeWithId(node.id, node.type, node.parentId, node)
      }
      for (const [id, changes] of delta.updated) graph.updateNode(id, changes)
      for (const id of delta.deleted) graph.deleteNode(id)
    })
  })
  graph.instanceIndex = new Map(delta.instanceIndex.map(([id, ids]) => [id, new Set(ids)]))
}

function nowMs(): number {
  return globalThis.performance?.now() ?? Date.now()
}

/**
 * Apply a worker population delta in wall-clock slices so the loading overlay
 * can keep painting. Same end state as {@link applyFigPopulationDelta}.
 */
export async function applyFigPopulationDeltaChunked(
  graph: SceneGraph,
  delta: FigPopulationDelta,
  options: {
    budgetMs?: number
    yieldBetween?: () => Promise<void>
    onChunk?: (progress: { completed: number; total: number }) => void
  } = {}
): Promise<void> {
  const budgetMs = options.budgetMs ?? 8
  const yieldBetween =
    options.yieldBetween ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
  const total = delta.created.length + delta.updated.length + delta.deleted.length
  let completed = 0
  let createdIndex = 0
  let updatedIndex = 0
  let deletedIndex = 0

  const report = () => {
    options.onChunk?.({ completed, total })
  }

  while (createdIndex < delta.created.length) {
    const deadline = nowMs() + budgetMs
    graph.runSilentMutations(() => {
      graph.preserveSourceMetadataDuring(() => {
        while (createdIndex < delta.created.length && nowMs() < deadline) {
          const [, node] = delta.created[createdIndex]
          createdIndex++
          graph.createNodeWithId(node.id, node.type, node.parentId, node)
          completed++
        }
      })
    })
    report()
    if (createdIndex < delta.created.length) await yieldBetween()
  }

  while (updatedIndex < delta.updated.length) {
    const deadline = nowMs() + budgetMs
    graph.runSilentMutations(() => {
      graph.preserveSourceMetadataDuring(() => {
        while (updatedIndex < delta.updated.length && nowMs() < deadline) {
          const [id, changes] = delta.updated[updatedIndex]
          updatedIndex++
          graph.updateNode(id, changes)
          completed++
        }
      })
    })
    report()
    if (updatedIndex < delta.updated.length) await yieldBetween()
  }

  while (deletedIndex < delta.deleted.length) {
    const deadline = nowMs() + budgetMs
    graph.runSilentMutations(() => {
      graph.preserveSourceMetadataDuring(() => {
        while (deletedIndex < delta.deleted.length && nowMs() < deadline) {
          const id = delta.deleted[deletedIndex]
          deletedIndex++
          graph.deleteNode(id)
          completed++
        }
      })
    })
    report()
    if (deletedIndex < delta.deleted.length) await yieldBetween()
  }

  graph.instanceIndex = new Map(delta.instanceIndex.map(([id, ids]) => [id, new Set(ids)]))
  report()
}
