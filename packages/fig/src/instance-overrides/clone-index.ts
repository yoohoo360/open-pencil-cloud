import type { OverrideContext } from './types'

export function buildCloneIndex(ctx: OverrideContext): Map<string, string[]> {
  const clonesBySource = new Map<string, string[]>()
  for (const [sourceId, nodeIds] of ctx.graph.instanceIndex) {
    for (const nodeId of nodeIds) {
      if (ctx.activeNodeIds && !ctx.activeNodeIds.has(nodeId)) continue
      if (ctx.graph.getNode(nodeId)?.type !== 'INSTANCE') continue
      const clones = clonesBySource.get(sourceId)
      if (clones) clones.push(nodeId)
      else clonesBySource.set(sourceId, [nodeId])
    }
  }
  return clonesBySource
}

export function instanceAndClones(
  instanceNodeId: string,
  clonesBySource: Map<string, string[]>,
  cache: Map<string, string[]>
): string[] {
  const cached = cache.get(instanceNodeId)
  if (cached) return cached
  const result: string[] = []
  const seen = new Set<string>()
  const visit = (id: string) => {
    if (seen.has(id)) return
    seen.add(id)
    result.push(id)
    for (const cloneId of clonesBySource.get(id) ?? []) visit(cloneId)
  }
  visit(instanceNodeId)
  cache.set(instanceNodeId, result)
  return result
}
