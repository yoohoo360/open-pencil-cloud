import { persistCloudSceneGraph } from '#react/app/document/cloud-document'
import type {
  AiReviewPayload,
  AiReviewRecord
} from '#react/app/document/ai-review/types'
import { recordDocumentVersion } from '#react/app/document/version-history/record'
import type { EditorStore } from '#react/app/editor/store'
import { documentAPI } from '#react/lib/client'

import { exportFigFile } from '@open-pencil/core/io'

const AI_REVIEW_VERSION_TITLE_PREFIX = 'AI review'

export async function exportCurrentFig(store: EditorStore): Promise<Uint8Array> {
  if (store.state.documentFigURL) {
    return persistCloudSceneGraph(store)
  }
  return exportFigFile(
    store.graph,
    store.renderer?.ck,
    store.renderer ?? undefined,
    store.state.currentPageId,
    false,
    { reuseOriginalArchive: false }
  )
}

/**
 * After AI succeeds: snapshot via version history, then create the review row
 * with history_id + payload JSON.
 */
export async function persistAiReview(options: {
  store: EditorStore
  payload: AiReviewPayload
  title?: string
  status?: 'draft' | 'completed'
}): Promise<AiReviewRecord> {
  const key = options.store.state.documentKey
  if (!key) throw new Error('No cloud document')

  const bytes = await exportCurrentFig(options.store)
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const versionTitle = options.title?.trim()
    ? `${AI_REVIEW_VERSION_TITLE_PREFIX}: ${options.title.trim()}`
    : `${AI_REVIEW_VERSION_TITLE_PREFIX} ${stamp}`

  const history = await recordDocumentVersion(
    options.store,
    'named',
    bytes,
    versionTitle,
    options.payload.ai?.summary
  )

  const payload: AiReviewPayload = {
    ...options.payload,
    history_id: history.id
  }

  const { data } = await documentAPI.createAiReview(key, {
    title: options.title?.trim() || versionTitle,
    status: options.status ?? 'completed',
    history_id: history.id,
    payload
  })
  if (!data) throw new Error('Review create returned no data')
  return data
}

export async function updateAiReview(options: {
  store: EditorStore
  reviewId: string
  payload: AiReviewPayload
  title?: string
  status?: 'draft' | 'completed'
  /** When true, take a new history snapshot and relink. */
  resnapshot?: boolean
}): Promise<AiReviewRecord> {
  const key = options.store.state.documentKey
  if (!key) throw new Error('No cloud document')

  let historyId = options.payload.history_id
  let payload = options.payload

  if (options.resnapshot) {
    const bytes = await exportCurrentFig(options.store)
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const versionTitle = options.title?.trim()
      ? `${AI_REVIEW_VERSION_TITLE_PREFIX}: ${options.title.trim()}`
      : `${AI_REVIEW_VERSION_TITLE_PREFIX} ${stamp}`
    const history = await recordDocumentVersion(
      options.store,
      'named',
      bytes,
      versionTitle,
      options.payload.ai?.summary
    )
    historyId = history.id
    payload = { ...payload, history_id: history.id }
  }

  const { data } = await documentAPI.updateAiReview(key, options.reviewId, {
    title: options.title,
    status: options.status,
    history_id: historyId,
    payload
  })
  if (!data) throw new Error('Review update returned no data')
  return data
}
