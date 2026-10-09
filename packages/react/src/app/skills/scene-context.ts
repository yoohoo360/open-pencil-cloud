import { executeDesignTool } from '#react/app/ai/chat/tools'
import type { EditorStore } from '#react/app/editor/store'
import { extractLookups } from '#react/app/skills/codegen-reply'

import type { SceneNode } from '@open-pencil/scene-graph'

export { extractLookups } from '#react/app/skills/codegen-reply'

const MAX_RELATED = 8
const MAX_CONTEXT_CHARS = 12_000

function collectDescendantIds(graph: EditorStore['graph'], rootId: string, into: Set<string>): void {
  const node = graph.getNode(rootId)
  if (!node) return
  into.add(rootId)
  for (const childId of node.childIds) collectDescendantIds(graph, childId, into)
}

/** Sibling / parent / name-matched layers outside the selection subtree. */
function relatedIdsOutsideSelection(store: EditorStore, selectedIds: string[]): string[] {
  const graph = store.graph
  const selectedTree = new Set<string>()
  for (const id of selectedIds) collectDescendantIds(graph, id, selectedTree)

  const related = new Set<string>()
  for (const id of selectedIds) {
    const node = graph.getNode(id)
    if (!node?.parentId) continue
    if (!selectedTree.has(node.parentId)) related.add(node.parentId)
    const parent = graph.getNode(node.parentId)
    if (!parent) continue
    for (const siblingId of parent.childIds) {
      if (selectedTree.has(siblingId)) continue
      const sibling = graph.getNode(siblingId)
      if (!sibling) continue
      // Prefer copy-bearing layers next to the selection.
      if (sibling.type === 'TEXT' || sibling.type === 'FRAME' || sibling.type === 'COMPONENT') {
        related.add(siblingId)
      }
    }
  }
  return [...related].slice(0, MAX_RELATED)
}

function stringifyToolResult(result: unknown): string {
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n…(truncated)`
}

async function describeIds(store: EditorStore, ids: string[]): Promise<string> {
  if (ids.length === 0) return ''
  const result = await executeDesignTool(store, 'describe', { ids, depth: 2 })
  if (!result.ok) return `(describe failed: ${result.error})`
  return stringifyToolResult(result.result)
}

async function lookupQuery(store: EditorStore, query: string): Promise<string> {
  // Prefer exact id when it exists on the graph.
  if (store.graph.getNode(query)) {
    return describeIds(store, [query])
  }
  const found = await executeDesignTool(store, 'find_nodes', { name: query })
  if (!found.ok) return `(find_nodes "${query}" failed: ${found.error})`
  const result = found.result as { nodes?: Array<{ id?: string; name?: string; type?: string }> }
  const nodes = result.nodes ?? []
  if (nodes.length === 0) return `(no nodes matching "${query}")`
  const ids = nodes
    .map((node) => node.id)
    .filter((id): id is string => typeof id === 'string')
    .slice(0, 4)
  const summaries = nodes
    .slice(0, 8)
    .map((node) => `- ${node.id} · ${node.type} · ${node.name}`)
    .join('\n')
  const detailed = await describeIds(store, ids)
  return `Matches for "${query}":\n${summaries}\n\nDescriptions:\n${detailed}`
}

/**
 * Canvas context for the planning phase: selection describe plus related layers
 * outside the selection (siblings/parent) with their copy and structure.
 * Uses Core tools via the React bridge — does not edit core/fig sources.
 */
export async function gatherPlanningSceneContext(store: EditorStore): Promise<string> {
  const selectedIds = [...store.state.selectedIds]
  if (selectedIds.length === 0) {
    return '(No layers selected.)'
  }

  const parts: string[] = []
  const selectionDescribe = await describeIds(store, selectedIds)
  parts.push(`## Selection (semantic describe)\n${selectionDescribe}`)

  const related = relatedIdsOutsideSelection(store, selectedIds)
  if (related.length > 0) {
    const relatedDescribe = await describeIds(store, related)
    parts.push(
      `## Related layers outside the selection (parent/siblings — copy and structure)\n${relatedDescribe}`
    )
  }

  // Lightweight text inventory for selected + related TEXT nodes via the graph.
  const textLines: string[] = []
  const seenText = new Set<string>()
  const consider = (node: SceneNode | undefined) => {
    if (!node || node.type !== 'TEXT' || seenText.has(node.id)) return
    seenText.add(node.id)
    const copy = (node.text ?? '').trim()
    if (!copy) return
    textLines.push(`- ${node.id} "${node.name}": ${copy.slice(0, 200)}`)
  }
  for (const id of [...selectedIds, ...related]) {
    const node = store.graph.getNode(id)
    consider(node)
    if (node) {
      for (const childId of node.childIds) consider(store.graph.getNode(childId))
    }
  }
  if (textLines.length > 0) {
    parts.push(`## Text / copy near the selection\n${textLines.join('\n')}`)
  }

  return truncate(parts.join('\n\n'), MAX_CONTEXT_CHARS)
}

/** Resolve `<lookup>` queries from a plan reply into describe text. */
export async function resolvePlanningLookups(
  store: EditorStore,
  planText: string
): Promise<string> {
  const queries = extractLookups(planText)
  if (queries.length === 0) return ''
  const chunks: string[] = []
  for (const query of queries.slice(0, MAX_RELATED)) {
    chunks.push(await lookupQuery(store, query))
  }
  return truncate(chunks.join('\n\n'), MAX_CONTEXT_CHARS)
}
