import { serializeSceneGraph } from '#core/kiwi/fig/parse/transfer.override'
import type {
  FigSessionOpenRequest,
  FigSessionRequest,
  FigSessionResponse
} from '#core/kiwi/fig/session/protocol.override'
import {
  figAllDefersRemaining,
  openReaderSession,
  type OpenReaderSessionOptions
} from '#core/kiwi/fig/session/reader.override'

let session: ReturnType<typeof openReaderSession> | undefined
let originalArchive: Uint8Array | undefined
let port: MessagePort | undefined

function respond(message: FigSessionResponse): void {
  port?.postMessage(message)
}

function populate(request: Extract<FigSessionRequest, { type: 'populate' }>): void {
  if (!session) throw new Error('FIG session has no retained reader')
  const result = session.populate(request.pageId)
  respond({
    type: 'population-result',
    requestId: request.requestId,
    baseRevision: request.baseRevision,
    ...result
  })
}

function handleRequest(request: FigSessionRequest): void {
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
    populate(request)
  } catch (error) {
    respond({
      type: 'population-error',
      requestId: request.type === 'populate' ? request.requestId : undefined,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

function shouldRetainSession(options: OpenReaderSessionOptions | undefined): boolean {
  const populate = options?.populate ?? 'all'
  return (
    populate === 'first-page' ||
    populate === 'none' ||
    figAllDefersRemaining(populate, options?.deferRemainingPages)
  )
}

self.onmessage = (event: MessageEvent<FigSessionOpenRequest>) => {
  const request = event.data
  port = request.port
  port.onmessage = (message: MessageEvent<FigSessionRequest>) => handleRequest(message.data)
  port.start()
  // The worker copies the archive itself, so the main thread sends the file once.
  originalArchive = new Uint8Array(request.buffer.slice(0))
  try {
    const openOptions: OpenReaderSessionOptions = {
      populate: request.options?.populate,
      preferPageSourceIds: request.options?.preferPageSourceIds,
      deferRemainingPages: request.options?.deferRemainingPages
    }
    const opened = openReaderSession(request.buffer, openOptions)
    respond({ type: 'page-manifest', pages: opened.pages })
    session = shouldRetainSession(openOptions) ? opened : undefined
    respond({
      type: 'graph',
      graph: serializeSceneGraph(opened.graph),
      checkpoint: opened.checkpoint()
    })
  } catch (error) {
    respond({ type: 'graph', error: error instanceof Error ? error.message : String(error) })
  }
}
