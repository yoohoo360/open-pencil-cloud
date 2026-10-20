export {
  MAX_PAGE_FREQUENCY_DOCUMENTS,
  MAX_PAGE_FREQUENCY_PAGES,
  readDocumentPageFrequency,
  readPreferredPageIds,
  recordPageVisit,
  writeDocumentPageFrequency
} from '#react/app/document/page-frequency/idb'
export type {
  DocumentPageFrequency,
  PageFrequencyEntry
} from '#react/app/document/page-frequency/types'

import type { SceneGraph } from '@open-pencil/scene-graph'

/** Stable id for frequency memory: fig source id when present, else graph page id. */
export function pageFrequencyIdForGraphPage(
  graph: SceneGraph,
  pageId: string
): string | null {
  const page = graph.getPages(true).find((entry) => entry.id === pageId)
  if (!page) return null
  const sourceId = page.source.id?.trim()
  return sourceId || page.id
}
