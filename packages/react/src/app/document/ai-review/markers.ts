import type {
  AiReviewDraft,
  AiReviewMarker,
  AiReviewPayload
} from '#react/app/document/ai-review/types'
import { skillSelectionFromCodegenPrefs } from '#react/app/document/ai-review/skills'
import type { EditorStore } from '#react/app/editor/store'

import { randomHex } from '@open-pencil/scene-graph/random'

export function emptyAiReviewPayload(pageId: string): AiReviewPayload {
  return {
    version: 1,
    page_id: pageId,
    markers: [],
    skills: skillSelectionFromCodegenPrefs()
  }
}

export function createAiReviewDraft(pageId: string): AiReviewDraft {
  return {
    title: '',
    requirement: '',
    pageId,
    payload: emptyAiReviewPayload(pageId)
  }
}

export function markerFromNodeId(store: EditorStore, nodeId: string): AiReviewMarker | null {
  const node = store.graph.getNode(nodeId)
  if (!node) return null
  const abs = store.graph.getAbsolutePosition(nodeId)
  return {
    id: `m_${randomHex(8)}`,
    node_id: nodeId,
    node_name: node.name || node.type,
    bounds: {
      x: abs.x,
      y: abs.y,
      w: node.width,
      h: node.height
    },
    comments: []
  }
}

/** Live canvas-space anchor for a marker (follows node moves). Falls back to stored bounds. */
export function markerAnchor(
  store: EditorStore,
  marker: AiReviewMarker
): { x: number; y: number; w: number; h: number } | null {
  const node = store.graph.getNode(marker.node_id)
  if (node) {
    const page = store.graph.closest(marker.node_id, (item) => item.type === 'CANVAS')
    if (page && store.state.currentPageId && page.id !== store.state.currentPageId) {
      return null
    }
    const abs = store.graph.getAbsolutePosition(marker.node_id)
    return { x: abs.x, y: abs.y, w: node.width, h: node.height }
  }
  if (!marker.bounds) return null
  return marker.bounds
}

/** Merge selected node ids into payload markers (skip duplicates by node_id). */
export function mergeSelectedMarkers(
  store: EditorStore,
  payload: AiReviewPayload,
  selectedIds: Iterable<string>
): AiReviewPayload {
  const existing = new Set(payload.markers.map((marker) => marker.node_id))
  const added: AiReviewMarker[] = []
  for (const id of selectedIds) {
    if (existing.has(id)) continue
    const marker = markerFromNodeId(store, id)
    if (!marker) continue
    existing.add(id)
    added.push(marker)
  }
  if (added.length === 0) return payload
  return {
    ...payload,
    page_id: store.state.currentPageId || payload.page_id,
    markers: [...payload.markers, ...added]
  }
}

export function removeMarker(
  payload: AiReviewPayload,
  markerId: string
): AiReviewPayload {
  return {
    ...payload,
    markers: payload.markers.filter((marker) => marker.id !== markerId)
  }
}

export function countPayload(payload: AiReviewPayload): {
  marker_count: number
  comment_count: number
} {
  return {
    marker_count: payload.markers.length,
    comment_count: payload.markers.reduce((sum, marker) => sum + marker.comments.length, 0)
  }
}
