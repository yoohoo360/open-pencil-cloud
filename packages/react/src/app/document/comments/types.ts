export type DocumentComment = {
  id: string
  thread_id: string
  document_id: string
  document_key: string
  body: string
  created_by: string
  created_by_name?: string | null
  created_by_avatar?: string | null
  created_at: number
  updated_at?: number
}

export type DocumentCommentThread = {
  id: string
  document_id: string
  document_key: string
  page_id: string
  node_id?: string | null
  x: number
  y: number
  resolved: boolean
  resolved_by?: string | null
  resolved_by_name?: string | null
  resolved_at?: number | null
  created_by: string
  created_by_name?: string | null
  created_by_avatar?: string | null
  created_at: number
  updated_at: number
  comments: DocumentComment[]
}

export type DocumentCommentList = {
  threads: DocumentCommentThread[]
}

export type CommentDraft = {
  pageId: string
  x: number
  y: number
}

export type CommentFilter = 'open' | 'resolved'
