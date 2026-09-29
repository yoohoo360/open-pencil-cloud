export type PageLoadingProgress = {
  /** Whether the canvas page-loading overlay is visible. */
  visible: boolean
  /** Populated user pages so far. */
  completed: number
  /** Total user-visible pages. */
  total: number
  /** Current page / node / phase detail (`Cover`, font face, …). */
  detail: string | null
}

export const OPEN_READY_PAGE_COUNT = 2

export function emptyPageLoadingProgress(): PageLoadingProgress {
  return { visible: false, completed: 0, total: 0, detail: null }
}

/** Professional status line: `1 of 4` or `1 of 4  ·  Cover`. */
export function formatPageLoadingStatus(progress: PageLoadingProgress): string {
  const detail = progress.detail?.trim()
  if (progress.total > 0) {
    const count = `${progress.completed} of ${progress.total}`
    return detail ? `${count}  ·  ${detail}` : count
  }
  return detail || 'Loading…'
}
