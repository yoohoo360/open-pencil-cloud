function startOfLocalDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function formatVersionTimestamp(ms: number, locale: string, now = Date.now()): string {
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

export function versionDisplayName(version: {
  title?: string | null
  created_by_name?: string | null
}): string {
  const title = version.title?.trim()
  if (title) return title
  const author = version.created_by_name?.trim()
  if (author) return author
  return 'Untitled version'
}
