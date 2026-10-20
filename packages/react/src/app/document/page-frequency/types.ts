export type PageFrequencyEntry = {
  /** Fig canvas source id when available, otherwise graph page id. */
  pageId: string
  count: number
}

export type DocumentPageFrequency = {
  documentKey: string
  /** ISO timestamp — used to evict the least-recently-updated file key. */
  updatedAt: string
  pages: PageFrequencyEntry[]
}
