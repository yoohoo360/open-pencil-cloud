import { createFigDocumentSession } from '@open-pencil/fig'
import type { FigPageManifestEntry } from '@open-pencil/kiwi/fig'

import { buildFigPopulationDelta, installFigMutationJournal } from '#core/kiwi/fig/population/delta'
import { readerSessionOptions, type FigReaderDiagnostic } from '#core/kiwi/fig/session/options'

export type FigPopulateMode = 'all' | 'first-page' | 'none'

export interface OpenReaderSessionOptions {
  populate?: FigPopulateMode
  /**
   * With `populate: 'all'`: load these fig source / graph page ids first (max 3),
   * then leave the rest for idle drain. Empty → first three non-internal pages when
   * {@link deferRemainingPages} is true.
   */
  preferPageSourceIds?: readonly string[] | null
  /**
   * With `populate: 'all'`: do not materialize every page on the open critical path.
   * Remaining pages stay pending for {@link scheduleFigAutoDrain} / population worker.
   */
  deferRemainingPages?: boolean
}

const PRIORITY_PAGE_LIMIT = 3

function resolvePrioritySourceIds(
  session: ReturnType<typeof createFigDocumentSession>,
  pages: readonly FigPageManifestEntry[],
  preferPageSourceIds?: readonly string[] | null
): string[] {
  const available = pages.filter((page) => !page.internalOnly)
  const bySource = new Map(available.map((page) => [page.sourceId, page.sourceId]))
  const ordered: string[] = []
  const push = (raw: string | null | undefined) => {
    const id = raw?.trim()
    if (!id || ordered.includes(id)) return
    if (bySource.has(id)) {
      ordered.push(id)
      return
    }
    for (const page of session.pages) {
      if (page.internalOnly) continue
      const graphId = session.graphPageId(page.id)
      if (graphId === id && !ordered.includes(page.id)) {
        ordered.push(page.id)
        return
      }
    }
  }
  for (const id of preferPageSourceIds ?? []) push(id)
  // No frequency memory: prefer the first three document pages.
  if (ordered.length === 0) {
    for (const page of available) {
      push(page.sourceId)
      if (ordered.length >= PRIORITY_PAGE_LIMIT) break
    }
  }
  return ordered.slice(0, PRIORITY_PAGE_LIMIT)
}

/** True when `all` should keep a session and defer unread pages. */
export function figAllDefersRemaining(
  populate: FigPopulateMode | undefined,
  deferRemainingPages: boolean | undefined
): boolean {
  return populate === 'all' && deferRemainingPages === true
}

/** Worker and main-thread transport for the .fig reader session. */
export function openReaderSession(
  bytes: ArrayBuffer,
  populateOrOptions: FigPopulateMode | OpenReaderSessionOptions = 'all'
) {
  const options: OpenReaderSessionOptions =
    typeof populateOrOptions === 'string'
      ? { populate: populateOrOptions }
      : (populateOrOptions ?? {})
  const populate = options.populate ?? 'all'
  const diagnostics: FigReaderDiagnostic[] = []
  const session = createFigDocumentSession(bytes, readerSessionOptions(diagnostics))
  const pages: FigPageManifestEntry[] = session.pages.map((page) => ({
    sourceId: page.id,
    name: page.name,
    position: page.position,
    internalOnly: page.internalOnly
  }))
  const sourceByGraph = new Map<string, string>()
  for (const page of session.pages) {
    const id = session.graphPageId(page.id)
    if (id) sourceByGraph.set(id, page.id)
  }
  const loadedGraphIds = () =>
    [...session.loadedPageIds].flatMap((id) => {
      const graphId = session.graphPageId(id)
      return graphId ? [graphId] : []
    })

  if (populate === 'all' && options.deferRemainingPages) {
    for (const sourceId of resolvePrioritySourceIds(
      session,
      pages,
      options.preferPageSourceIds
    )) {
      session.loadPage(sourceId)
    }
  } else if (populate === 'all') {
    for (const page of pages) if (!page.internalOnly) session.loadPage(page.sourceId)
  } else if (populate === 'first-page') {
    const page = pages.find((entry) => !entry.internalOnly)
    if (page) session.loadPage(page.sourceId)
  }

  return {
    session,
    diagnostics,
    checkpoint: () => session.checkpoint(),
    graph: session.graph,
    pages,
    populate(pageId: string) {
      const sourceId = sourceByGraph.get(pageId)
      if (!sourceId) throw new Error(`Unknown graph page ${pageId}`)
      const populated = !session.loadedPageIds.has(sourceId)
      const journal = installFigMutationJournal(session.graph)
      try {
        while (!session.loadedPageIds.has(sourceId)) session.loadPage(sourceId)
        return {
          checkpoint: session.checkpoint(),
          populated,
          delta: buildFigPopulationDelta(session.graph, journal, loadedGraphIds())
        }
      } finally {
        journal.stop()
      }
    }
  }
}
