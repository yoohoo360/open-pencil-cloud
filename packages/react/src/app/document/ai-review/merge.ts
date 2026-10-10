import type { AiReviewFindings } from '#react/app/document/ai-review/schema'
import type {
  AiReviewComment,
  AiReviewMarker,
  AiReviewPayload
} from '#react/app/document/ai-review/types'

import { randomHex } from '@open-pencil/scene-graph/random'

export function mergeAiFindings(
  payload: AiReviewPayload,
  findings: AiReviewFindings,
  options?: {
    model?: string
    /** Create a marker for a node the AI referenced that was not pre-selected. */
    resolveMarker?: (nodeId: string) => AiReviewMarker | null
  }
): AiReviewPayload {
  const now = Date.now()
  const byNode = new Map(
    payload.markers.map((marker) => [marker.node_id, { ...marker, comments: [...marker.comments] }])
  )
  const addedIds: string[] = []

  for (const finding of findings.markers) {
    let marker = byNode.get(finding.node_id)
    if (!marker) {
      const resolved = options?.resolveMarker
        ? options.resolveMarker(finding.node_id)
        : ({
            id: `m_${randomHex(8)}`,
            node_id: finding.node_id,
            comments: []
          } satisfies AiReviewMarker)
      if (!resolved) continue
      marker = resolved
      addedIds.push(finding.node_id)
      byNode.set(finding.node_id, marker)
    }
    const comments: AiReviewComment[] = finding.comments.map((comment) => ({
      id: `c_${randomHex(8)}`,
      body: comment.body,
      severity: comment.severity ?? 'warning',
      source: 'ai',
      created_at: now,
      status: 'open',
      edit: comment.edit
    }))
    marker.comments = [...marker.comments, ...comments]
    byNode.set(finding.node_id, marker)
  }

  const existing = payload.markers.map((marker) => byNode.get(marker.node_id) ?? marker)
  const created = addedIds
    .map((nodeId) => byNode.get(nodeId))
    .filter((marker): marker is AiReviewMarker => Boolean(marker))

  return {
    ...payload,
    markers: [...existing, ...created],
    ai: {
      model: options?.model,
      summary: findings.summary,
      ran_at: now
    }
  }
}
