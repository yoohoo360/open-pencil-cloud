import type {
  AiReviewComment,
  AiReviewMarker,
  AiReviewSeverity
} from '#react/app/document/ai-review/types'

const SEVERITY_RANK: Record<AiReviewSeverity, number> = {
  error: 3,
  warning: 2,
  info: 1
}

/** Highest severity among open comments; defaults to info when empty. */
export function markerSeverity(marker: AiReviewMarker): AiReviewSeverity {
  let best: AiReviewSeverity = 'info'
  let rank = 0
  for (const comment of marker.comments) {
    if (comment.status === 'dismissed') continue
    const next = SEVERITY_RANK[comment.severity] ?? 0
    if (next > rank) {
      rank = next
      best = comment.severity
    }
  }
  return best
}

export function openComments(marker: AiReviewMarker): AiReviewComment[] {
  return marker.comments.filter((comment) => comment.status !== 'dismissed')
}

/** Small color dot in the properties list (no severity text). */
export const SEVERITY_DOT_CLASS: Record<AiReviewSeverity, string> = {
  error: 'bg-danger',
  warning: 'bg-amber-500',
  info: 'bg-accent'
}
