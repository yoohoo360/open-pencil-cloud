import type { FigPageManifestEntry } from '@open-pencil/kiwi/fig'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { randomHex } from '@open-pencil/scene-graph/random'

import { IS_BROWSER } from '#core/constants'
import { deserializeSceneGraph } from '#core/kiwi/fig/parse/transfer'
import {
  registerFigPopulationWorker,
  registerOriginalArchiveRequest,
  retainOriginalArchive
} from '#core/kiwi/fig/population/client.override'
import { scheduleFigAutoDrain } from '#core/kiwi/fig/session/auto-drain.override'
import { createFigSessionWorker } from '#core/kiwi/fig/session/client.override'
import {
  registerReaderRecovery,
  registerReaderSession
} from '#core/kiwi/fig/session/document-state'
import type { FigSessionOpenRequest, FigSessionResponse } from '#core/kiwi/fig/session/protocol.override'
import {
  figAllDefersRemaining,
  openReaderSession,
  type OpenReaderSessionOptions
} from '#core/kiwi/fig/session/reader.override'

export interface ParseFigFileOptions {
  populate?: 'all' | 'first-page' | 'none'
  onPages?: (pages: readonly FigPageManifestEntry[]) => void
  signal?: AbortSignal
  /**
   * Prefer a Web Worker for decode. When true (browser default), lazy FIG
   * context stays in the worker and later page switches pay a large delta cost.
   * Pass false to keep context on the main graph for faster page switches.
   */
  useWorker?: boolean
  /**
   * With `populate: 'all'` + {@link deferRemainingPages}: load these page ids
   * first (fig source id or graph page id). Cap is 3 inside the reader.
   */
  preferPageSourceIds?: readonly string[] | null
  /**
   * With `populate: 'all'`: materialize preferred pages only, then finish the
   * rest via the population worker (or idle main-thread drain when sync).
   */
  deferRemainingPages?: boolean
}

class ReaderSemanticError extends Error {
  override name = 'ReaderSemanticError'
}

function readerOpenOptions(options: ParseFigFileOptions): OpenReaderSessionOptions {
  return {
    populate: options.populate,
    preferPageSourceIds: options.preferPageSourceIds,
    deferRemainingPages: options.deferRemainingPages
  }
}

function keepsLazySession(options: ParseFigFileOptions): boolean {
  return (
    options.populate === 'first-page' ||
    options.populate === 'none' ||
    figAllDefersRemaining(options.populate, options.deferRemainingPages)
  )
}

function parseFigFileSync(buffer: ArrayBuffer, options: ParseFigFileOptions = {}): SceneGraph {
  options.signal?.throwIfAborted()
  const reader = openReaderSession(buffer, readerOpenOptions(options))
  options.onPages?.(reader.pages)
  options.signal?.throwIfAborted()
  const bytes = buffer.slice(0)
  registerReaderSession(bytes, reader.session, reader.diagnostics)
  const retained = new Uint8Array(bytes.slice(0))
  retainOriginalArchive(reader.graph, retained)
  registerOriginalArchiveRequest(reader.graph, async () => retained.slice())
  if (figAllDefersRemaining(options.populate, options.deferRemainingPages)) {
    scheduleFigAutoDrain(reader.graph)
  }
  return reader.graph
}

export function parseFigFileViaWorker(
  buffer: ArrayBuffer,
  options: ParseFigFileOptions
): Promise<SceneGraph> {
  return new Promise((resolve, reject) => {
    options.signal?.throwIfAborted()
    const worker = createFigSessionWorker()
    const channel = new MessageChannel()
    const pendingArchives = new Map<string, (bytes: Uint8Array) => void>()
    // Keep a main-thread copy before transferring buffers into the session worker.
    const retainedArchive = new Uint8Array(buffer.slice(0))
    const abort = () => {
      channel.port1.postMessage({ type: 'dispose' })
      channel.port1.close()
      worker.terminate()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    const cleanupAbort = () => options.signal?.removeEventListener('abort', abort)

    // A listener of its own: registerFigPopulationWorker takes over port1.onmessage
    // once the graph arrives, and archive requests are made after that.
    channel.port1.addEventListener('message', (e: MessageEvent<FigSessionResponse>) => {
      if (e.data.type !== 'original-archive-result') return
      const resolveArchive = pendingArchives.get(e.data.requestId)
      if (!resolveArchive) return
      pendingArchives.delete(e.data.requestId)
      resolveArchive(e.data.bytes)
    })
    channel.port1.onmessage = (e: MessageEvent<FigSessionResponse>) => {
      if (e.data.type === 'page-manifest') {
        options.onPages?.(e.data.pages)
        return
      }
      if (e.data.type !== 'graph') return
      if (e.data.error || !e.data.graph) {
        cleanupAbort()
        channel.port1.close()
        worker.terminate()
        reject(new ReaderSemanticError(e.data.error ?? 'Worker failed to parse .fig file'))
        return
      }
      try {
        const graph = deserializeSceneGraph(e.data.graph)
        if (keepsLazySession(options)) {
          cleanupAbort()
          if (!e.data.checkpoint) throw new Error('Missing reader checkpoint')
          registerReaderRecovery(graph, buffer.slice(0), e.data.checkpoint)
          retainOriginalArchive(graph, retainedArchive)
          registerFigPopulationWorker(graph, worker, channel.port1)
          registerOriginalArchiveRequest(
            graph,
            () =>
              new Promise<Uint8Array>((resolveArchive) => {
                const requestId = randomHex()
                pendingArchives.set(requestId, resolveArchive)
                channel.port1.postMessage({ type: 'original-archive', requestId })
              })
          )
        } else {
          cleanupAbort()
          channel.port1.close()
          worker.terminate()
        }
        resolve(graph)
      } catch (error) {
        cleanupAbort()
        channel.port1.close()
        worker.terminate()
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    }
    channel.port1.start()
    worker.onerror = (err) => {
      cleanupAbort()
      channel.port1.close()
      worker.terminate()
      reject(new Error(err.message || 'Worker failed to parse .fig file'))
    }
    const workerBuffer = buffer.slice(0)
    const request: FigSessionOpenRequest = {
      type: 'open',
      buffer: workerBuffer,
      options: {
        populate: options.populate,
        preferPageSourceIds: options.preferPageSourceIds,
        deferRemainingPages: options.deferRemainingPages
      },
      port: channel.port2
    }
    worker.postMessage(request, [workerBuffer, channel.port2])
  })
}

export async function parseFigFile(
  buffer: ArrayBuffer,
  options: ParseFigFileOptions = {}
): Promise<SceneGraph> {
  options.signal?.throwIfAborted()
  const useWorker = options.useWorker !== false
  if (useWorker && typeof Worker !== 'undefined' && IS_BROWSER) {
    try {
      // The worker gets its own copy, so `buffer` is still whole for the fallback.
      return await parseFigFileViaWorker(buffer, options)
    } catch (error) {
      if (options.signal?.aborted || error instanceof ReaderSemanticError) throw error
      console.warn('Worker parsing failed, falling back to main thread:', error)
      return parseFigFileSync(buffer, options)
    }
  }
  options.signal?.throwIfAborted()
  return parseFigFileSync(buffer, options)
}

export async function readFigFile(
  file: File,
  options: ParseFigFileOptions = {}
): Promise<SceneGraph> {
  options.signal?.throwIfAborted()
  const buffer = await file.arrayBuffer()
  options.signal?.throwIfAborted()
  return parseFigFile(buffer, options)
}
