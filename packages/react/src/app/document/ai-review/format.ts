export function formatReviewTimestamp(ms: number, locale: string, now = Date.now()): string {
  const date = new Date(ms)
  const sameDay =
    date.getFullYear() === new Date(now).getFullYear() &&
    date.getMonth() === new Date(now).getMonth() &&
    date.getDate() === new Date(now).getDate()
  if (sameDay) {
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function reviewAuthorName(review: {
  created_by_name?: string | null
  created_by: string
}): string {
  const name = review.created_by_name?.trim()
  return name && name.length > 0 ? name : 'Someone'
}
