import { selectionToJSX } from '@open-pencil/design-jsx'
import type { SceneGraph } from '@open-pencil/scene-graph'

/** How canvas/tool payloads are written into the chat HTTP transcript. */
export type ChatCanvasFormat = 'json' | 'jsx'

const MAX_JSX_CHARS = 12_000

export function isChatCanvasFormat(value: unknown): value is ChatCanvasFormat {
  return value === 'json' || value === 'jsx'
}

function clipJsx(jsx: string): string {
  if (jsx.length <= MAX_JSX_CHARS) return jsx
  return `${jsx.slice(0, MAX_JSX_CHARS)}\n…(truncated)`
}

/** Node ids from typical design-tool JSON results (`render`, `get_selection`, …). */
export function extractResultNodeIds(result: unknown): string[] {
  if (!result || typeof result !== 'object') return []
  const ids: string[] = []
  if ('deleted' in result && typeof result.deleted === 'string') return []
  if ('id' in result && typeof result.id === 'string') ids.push(result.id)
  if ('created' in result && Array.isArray(result.created)) {
    for (const item of result.created) {
      if (typeof item === 'string') ids.push(item)
      else if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        ids.push(item.id)
      }
    }
  }
  if ('selection' in result && Array.isArray(result.selection)) {
    for (const item of result.selection) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        ids.push(item.id)
      }
    }
  }
  if ('results' in result && Array.isArray(result.results)) {
    for (const item of result.results) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        ids.push(item.id)
      }
    }
  }
  if ('nodes' in result && Array.isArray(result.nodes)) {
    for (const item of result.nodes) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        ids.push(item.id)
      }
    }
  }
  return ids
}

/**
 * Encode a tool payload for the next model HTTP turn.
 * `json` is `JSON.stringify`. `jsx` is Design JSX for node-bearing results, JSON otherwise.
 */
export function formatChatToolContent(
  graph: SceneGraph,
  payload: unknown,
  format: ChatCanvasFormat
): string {
  if (format === 'json') return JSON.stringify(payload ?? null)
  if (payload && typeof payload === 'object' && 'error' in payload) {
    return JSON.stringify(payload)
  }
  if (payload && typeof payload === 'object' && 'jsx' in payload && typeof payload.jsx === 'string') {
    return clipJsx(payload.jsx)
  }
  const ids = extractResultNodeIds(payload)
  if (ids.length === 0) return JSON.stringify(payload ?? null)
  const jsx = selectionToJSX(ids, graph).trim()
  if (!jsx) return JSON.stringify(payload ?? null)
  return clipJsx(jsx)
}

export const JSX_TRANSCRIPT_HINT =
  'Canvas tool results in this conversation are Design JSX (same syntax as the render tool). Non-layer tools still return JSON.'
