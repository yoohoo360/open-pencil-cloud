export type AiReviewSeverity = 'error' | 'warning' | 'info'
export type AiReviewCommentSource = 'ai' | 'human'
export type AiReviewCommentStatus = 'open' | 'accepted' | 'dismissed'
export type AiReviewStatus = 'draft' | 'completed'

export type AiReviewBounds = {
  x: number
  y: number
  w: number
  h: number
}

export type AiReviewComment = {
  id: string
  body: string
  severity: AiReviewSeverity
  source: AiReviewCommentSource
  created_at: number
  created_by?: { id: string; name?: string }
  status: AiReviewCommentStatus
  edit?: { original?: string; proposed?: string }
}

export type AiReviewMarker = {
  id: string
  node_id: string
  node_name?: string
  bounds?: AiReviewBounds
  comments: AiReviewComment[]
}

export type AiReviewSkillSelection = {
  /** When true, every personal skill is included (default from chat skill prefs). */
  all?: boolean
  group_ids: string[]
  skill_ids: string[]
}

export type AiReviewPayload = {
  version: 1
  requirement?: { title?: string; content: string }
  page_id: string
  markers: AiReviewMarker[]
  /** Skills / groups applied when this review ran. */
  skills?: AiReviewSkillSelection
  ai?: { model?: string; summary?: string; ran_at?: number }
  history_id?: string
}

export type AiReviewSummary = {
  id: string
  document_id?: string
  document_key: string
  title?: string | null
  status: AiReviewStatus
  history_id: string
  history_title?: string | null
  history_created_at?: number | null
  marker_count: number
  comment_count: number
  created_by: string
  created_by_name?: string | null
  created_by_avatar?: string | null
  created_at: number
  updated_by?: string | null
  updated_by_name?: string | null
  updated_at: number
}

export type AiReviewRecord = AiReviewSummary & {
  payload: AiReviewPayload
}

export type AiReviewList = {
  reviews: AiReviewSummary[]
}

export type AiReviewDraft = {
  title: string
  requirement: string
  pageId: string
  payload: AiReviewPayload
}
