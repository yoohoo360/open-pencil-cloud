import type { DocumentCommentThread } from '#react/app/document/comments/types'

export type CommentDateGroup = 'today' | 'yesterday' | 'older'

export type CommentThreadGroup = {
  key: CommentDateGroup
  threads: DocumentCommentThread[]
}

function startOfLocalDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function commentDateGroup(ms: number, now = Date.now()): CommentDateGroup {
  const day = startOfLocalDay(ms)
  const today = startOfLocalDay(now)
  const yesterday = today - 24 * 60 * 60 * 1000
  if (day === today) return 'today'
  if (day === yesterday) return 'yesterday'
  return 'older'
}

export function groupCommentThreads(
  threads: DocumentCommentThread[],
  now = Date.now()
): CommentThreadGroup[] {
  const buckets: Record<CommentDateGroup, DocumentCommentThread[]> = {
    today: [],
    yesterday: [],
    older: []
  }
  for (const thread of threads) {
    buckets[commentDateGroup(thread.updated_at ?? thread.created_at, now)].push(thread)
  }
  return (['today', 'yesterday', 'older'] as const)
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, threads: buckets[key] }))
}
