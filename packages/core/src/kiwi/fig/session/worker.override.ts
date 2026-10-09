import { parseFigBuffer } from '@open-pencil/fig'
import type { SceneGraph } from '@open-pencil/scene-graph'

// Explicit overrides: the session worker entry may not rewrite `#core/...` aliases.
import { importNodeChanges } from '#core/kiwi/fig/import.override'
import {
  getLazyFigImportContext,
  populateLazyFigImportRoots,
  populateLazyFigImportRootsChunked
} from '#core/kiwi/fig/lazy-import.override'
import { serializeSceneGraph } from '#core/kiwi/fig/parse/transfer.override'
import { buildFigPopulationDelta, installFigMutationJournal } from '#core/kiwi/fig/population/delta'
import type {
  FigSessionOpenRequest,
  FigSessionRequest,
  FigSessionResponse
} from '#core/kiwi/fig/session/protocol.override'
import { openReaderSession } from '#core/kiwi/fig/session/reader'

let session: ReturnType<typeof openReaderSession> | undefined
let originalArchive: Uint8Array | undefined
let port: MessagePort | undefined

function respond(message: FigSessionResponse): void {
  port?.postMessage(message)
}

function yieldBetweenChunks(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0)
  })
}

async function populate(request: Extract<FigSessionRequest, { type: 'populate' }>): Promise<void> {
  if (!graph) throw new Error('FIG session has no retained graph')
  const journal = installFigMutationJournal(graph)
  try {
    respond({
      type: 'population-progress',
      requestId: request.requestId,
      completed: 0,
      stage: 'nodes'
    })
    let populated = await populateLazyFigImportRootsChunked(graph, [request.pageId], {
      materializeBudgetMs: 8,
      populateBudgetMs: 8,
      yieldBetween: yieldBetweenChunks,
      onChunk: (info) => {
        const stage =
          info?.stage === 'instances'
            ? 'instances'
            : info?.stage === 'overrides'
              ? 'overrides'
              : 'nodes'
        respond({
          type: 'population-progress',
          requestId: request.requestId,
          completed: typeof info?.completed === 'number' ? info.completed : 0,
          total: info?.total,
          stage
        })
      }
    })
    if (!populated) {
      populated = populateLazyFigImportRoots(graph, [request.pageId])
      respond({
        type: 'population-progress',
        requestId: request.requestId,
        completed: 0,
        stage: 'nodes'
      })
    }
    const context = getLazyFigImportContext(graph)
    if (!context) throw new Error('FIG session has no lazy import context')
    respond({
      type: 'population-result',
      requestId: request.requestId,
      baseRevision: request.baseRevision,
      populated,
      delta: buildFigPopulationDelta(graph, journal, context.populatedRootIds)
    })
  } finally {
    journal.stop()
  }
}

async function handleRequest(request: FigSessionRequest): Promise<void> {
  try {
    if (request.type === 'original-archive') {
      if (!originalArchive) throw new Error('FIG session has no original archive')
      const bytes = originalArchive.slice()
      port?.postMessage({ type: 'original-archive-result', requestId: request.requestId, bytes }, [
        bytes.buffer
      ])
      return
    }
    if (request.type === 'dispose') {
      session = undefined
      originalArchive = undefined
      respond({ type: 'disposed' })
      port?.close()
      port = undefined
      self.close()
      return
    }
    if (request.type === 'cancel') return
    await populate(request)
  } catch (error) {
    respond({
      type: 'population-error',
      requestId: request.type === 'populate' ? request.requestId : undefined,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

self.onmessage = (event: MessageEvent<FigSessionOpenRequest>) => {
  const request = event.data
  port = request.port
  port.onmessage = (message: MessageEvent<FigSessionRequest>) => {
    void handleRequest(message.data)
  }
  port.start()
  // The worker copies the archive itself, so the main thread sends the file once.
  originalArchive = new Uint8Array(request.buffer.slice(0))
  try {
    const opened = openReaderSession(request.buffer, request.options?.populate)
    respond({ type: 'page-manifest', pages: opened.pages })
    session =
      request.options?.populate === 'first-page' || request.options?.populate === 'none'
        ? opened
        : undefined
    respond({
      type: 'graph',
      graph: serializeSceneGraph(opened.graph),
      checkpoint: opened.checkpoint()
    })
  } catch (error) {
    respond({ type: 'graph', error: error instanceof Error ? error.message : String(error) })
  }
}
