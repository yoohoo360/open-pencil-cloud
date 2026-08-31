export type DocumentVersionKind = 'named' | 'autosave'

export type DocumentVersion = {
  id: string
  document_id?: string
  document_key: string
  kind: DocumentVersionKind
  title?: string | null
  description?: string | null
  url: string
  created_by?: string | null
  created_by_name?: string | null
  created_at: number
}

export type DocumentVersionList = {
  current_updated_at: number
  autosave_count: number
  autosaves: DocumentVersion[]
  named: DocumentVersion[]
  named_has_more: boolean
}

export type VersionHistorySelection = 'current' | string
