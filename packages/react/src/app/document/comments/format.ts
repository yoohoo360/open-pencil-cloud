function startOfLocalDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function formatCommentTimestamp(ms: number, locale: string, now = Date.now()): string {
  const date = new Date(ms)
  const sameDay = startOfLocalDay(ms) === startOfLocalDay(now)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  if (sameDay) {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    year: sameYear ? undefined : 'numeric'
  }).format(date)
}

export function commentAuthorName(comment: {
  created_by_name?: string | null
}): string {
  const name = comment.created_by_name?.trim()
  return name || 'Unknown'
}

export function commentSnippet(body: string, maxLength = 80): string {
  const text = body.trim().replace(/\s+/g, ' ')
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function threadPreview(thread: { comments: Array<{ body: string }> }): string {
  const first = thread.comments[0]?.body ?? ''
  return commentSnippet(first)
}
