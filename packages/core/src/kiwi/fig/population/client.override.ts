import type { SceneGraph } from '@open-pencil/scene-graph'

import { getLazyFigImportContext } from '#core/kiwi/fig/lazy-import.override'
import { createFigSessionWorker } from '#core/kiwi/fig/session/client.override'
import type { FigSessionOpenRequest, FigSessionResponse } from '#core/kiwi/fig/session/protocol.override'
import { randomHex } from '#core/random'

import {
  applyFigPopulationDeltaChunked,
  type FigPopulationDelta
} from './delta.override'

interface PopulationResult {
  type: 'population-result'
  requestId: string
  baseRevision: number
  populated: boolean
  delta: FigPopulationDelta
}
interface PopulationProgress {
  type: 'population-progress'
  requestId: string
  completed: number
  total?: number
  stage?: 'nodes' | 'instances' | 'overrides'
}
type WorkerResult =
  | PopulationResult
  | PopulationProgress
  | { type: 'population-error'; error: string }

const MAX_FIG_POPULATION_WORKER_NODES = 200_000
const FIG_POPULATION_WORKER_TIMEOUT_MS = 30_000
const populationWorkers = new WeakMap<SceneGraph, FigPopulationWorker>()
interface OriginalArchiveRequest {
  request: () => Promise<Uint8Array>
  valid: boolean
  unbind: () => void
}
const originalArchiveRequests = new WeakMap<SceneGraph, OriginalArchiveRequest>()
/** Immutable source bytes kept on the main thread so cold pages can revive a dead worker. */
const retainedOriginalArchives = new WeakMap<SceneGraph, Uint8Array>()

export interface FigPopulationWorkerTelemetry {
  event: 'registered' | 'populate' | 'fallback' | 'stale' | 'terminated'
  reason?: 'oversized' | 'graph-mutation' | 'worker-error'
  durationMs?: number
  applyMs?: number
  created?: number
  updated?: number
  deleted?: number
}

function emitTelemetry(detail: FigPopulationWorkerTelemetry): void {
  if (typeof globalThis.dispatchEvent !== 'function') return
  globalThis.dispatchEvent(new CustomEvent('openpencil:fig-population-worker', { detail }))
}

export function registerFigPopulationWorker(
  graph: SceneGraph,
  worker: Worker,
  port?: MessagePort
): void {
  if (graph.nodes.size > MAX_FIG_POPULATION_WORKER_NODES) {
    emitTelemetry({ event: 'fallback', reason: 'oversized' })
    if (!port) {
      worker.terminate()
      return
    }
    populationWorkers.set(graph, createDisposalOnlyWorker(worker, port))
    return
  }
  const client = createPopulationWorkerClient(graph, worker, port)
  populationWorkers.set(graph, client)
  emitTelemetry({ event: 'registered' })
}

export function canUseFigPopulationWorker(graph: SceneGraph): boolean {
  // Worker retains the lazy import context; the main-thread graph is a transfer
  // copy and usually has no WeakMap context of its own.
  return populationWorkers.has(graph)
}

export function registerOriginalArchiveRequest(
  graph: SceneGraph,
  request: () => Promise<Uint8Array>
): void {
  const entry: OriginalArchiveRequest = { request, valid: true, unbind: () => undefined }
  const invalidate = () => {
    if (!graph.isApplyingLayout) entry.valid = false
  }
  entry.unbind = graph.onNodeEvents({
    created: invalidate,
    updated: invalidate,
    deleted: invalidate,
    reparented: invalidate,
    reordered: invalidate
  })
  originalArchiveRequests.set(graph, entry)
}

export async function requestOriginalArchive(graph: SceneGraph): Promise<Uint8Array | null> {
  const retained = retainedOriginalArchives.get(graph)
  if (retained) return retained.slice()
  const entry = originalArchiveRequests.get(graph)
  if (!entry?.valid) return null
  const archive = await entry.request()
  return originalArchiveRequests.get(graph)?.valid === true &&
    originalArchiveRequests.get(graph) === entry
    ? archive
    : null
}

/** Keep a main-thread copy of the .fig bytes for worker revive after termination. */
export function retainOriginalArchive(graph: SceneGraph, bytes: Uint8Array): void {
  retainedOriginalArchives.set(graph, bytes.slice())
}

/**
 * Re-bind a session worker to an existing live graph when the previous worker
 * was terminated (protocol mismatch, timeout, HMR, etc.).
 */
export async function reviveFigPopulationWorker(
  graph: SceneGraph,
  signal?: AbortSignal
): Promise<FigPopulationWorker | null> {
  const existing = createFigPopulationWorker(graph)
  if (existing) return existing
  const archive = await requestOriginalArchive(graph)
  if (!archive || archive.byteLength === 0) return null
  signal?.throwIfAborted()

  return await new Promise<FigPopulationWorker | null>((resolve, reject) => {
    let settled = false
    const worker = createFigSessionWorker()
    const channel = new MessageChannel()
    const finish = (value: FigPopulationWorker | null) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      resolve(value)
    }
    const onAbort = () => {
      channel.port1.postMessage({ type: 'dispose' })
      channel.port1.close()
      worker.terminate()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    channel.port1.onmessage = (event: MessageEvent<FigSessionResponse>) => {
      const message = event.data
      if (message.type === 'page-manifest') return
      if (message.type !== 'graph') return
      if (message.error || !message.graph) {
        channel.port1.close()
        worker.terminate()
        finish(null)
        return
      }
      // Discard the worker's deserialized graph — bind the session to the live graph.
      registerFigPopulationWorker(graph, worker, channel.port1)
      finish(createFigPopulationWorker(graph))
    }
    channel.port1.start()
    worker.onerror = () => {
      channel.port1.close()
      worker.terminate()
      finish(null)
    }
    const originalBuffer = archive.buffer.slice(
      archive.byteOffset,
      archive.byteOffset + archive.byteLength
    ) as ArrayBuffer
    const archiveBuffer = originalBuffer.slice(0)
    const request: FigSessionOpenRequest = {
      type: 'open',
      originalBuffer,
      archiveBuffer,
      options: { populate: 'first-page' },
      port: channel.port2
    }
    worker.postMessage(request, [originalBuffer, archiveBuffer, channel.port2])
  })
}

export function releaseFigPopulationWorker(graph: SceneGraph): void {
  populationWorkers.get(graph)?.terminate()
  populationWorkers.delete(graph)
  originalArchiveRequests.get(graph)?.unbind()
  originalArchiveRequests.delete(graph)
  retainedOriginalArchives.delete(graph)
}

export interface FigPopulationProgress {
  completed: number
  total?: number
  stage?: 'nodes' | 'instances' | 'overrides'
}

export interface FigPopulationWorker {
  populate: (
    pageId: string,
    signal?: AbortSignal,
    onProgress?: (progress: FigPopulationProgress) => void
  ) => Promise<boolean | null>
  terminate: () => void
}

function createDisposalOnlyWorker(worker: Worker, port: MessagePort): FigPopulationWorker {
  let disposed = false
  return {
    populate: (_pageId, _signal, _onProgress) => Promise.resolve(null),
    terminate() {
      if (disposed) return
      disposed = true
      emitTelemetry({ event: 'terminated' })
      port.postMessage({ type: 'dispose' })
      port.close()
      worker.terminate()
    }
  }
}

export function createFigPopulationWorker(graph: SceneGraph): FigPopulationWorker | null {
  if (!canUseFigPopulationWorker(graph)) return null
  return populationWorkers.get(graph) ?? null
}

function createPopulationWorkerClient(
  graph: SceneGraph,
  worker: Worker,
  port?: MessagePort
): FigPopulationWorker {
  const pending = new Map<
    string,
    {
      resolve: (value: boolean | null) => void
      abort?: () => void
      onProgress?: (progress: FigPopulationProgress) => void
      revision: number
      startedAt: number
      timeout: ReturnType<typeof setTimeout>
    }
  >()
  let revision = 0
  let stale = false
  let disposed = false
  let applyingDelta = false
  const invalidate = () => {
    // Layout recomputation (import-time or after a switch) is derived from the
    // same scene graph the worker deltas were built from; it must not count as
    // user divergence. Only real user edits invalidate the worker.
    if (applyingDelta || stale || graph.isApplyingLayout) return
    revision++
    stale = true
    emitTelemetry({ event: 'stale', reason: 'graph-mutation' })
  }
  let unbind: (() => void) | undefined
  const releaseSubscription = () => {
    unbind?.()
    unbind = undefined
  }
  const fail = (emit = true) => {
    stale = true
    if (emit) emitTelemetry({ event: 'fallback', reason: 'worker-error' })
    for (const request of pending.values()) {
      clearTimeout(request.timeout)
      request.abort?.()
      request.resolve(null)
    }
    pending.clear()
    releaseSubscription()
    worker.terminate()
    populationWorkers.delete(graph)
  }
  unbind = graph.onNodeEvents({
    created: invalidate,
    updated: invalidate,
    deleted: invalidate,
    reparented: invalidate,
    reordered: invalidate
  })
  const receive = (result: WorkerResult | FigSessionResponse) => {
    if (result.type === 'page-manifest' || result.type === 'graph' || result.type === 'disposed') {
      return
    }
    if (result.type === 'original-archive-result') return
    if (result.type === 'population-error') return fail()
    if (result.type === 'population-progress') {
      const request = pending.get(result.requestId)
      if (!request) return
      // Chunked worker populate can outlive a single idle timeout; refresh on progress.
      clearTimeout(request.timeout)
      request.timeout = setTimeout(() => fail(), FIG_POPULATION_WORKER_TIMEOUT_MS)
      request.onProgress?.({
        completed: result.completed,
        total: result.total,
        stage: result.stage
      })
      return
    }
    const request = pending.get(result.requestId)
    if (!request) return
    clearTimeout(request.timeout)
    request.abort?.()
    pending.delete(result.requestId)
    if (stale || revision !== request.revision || result.baseRevision !== request.revision) {
      emitTelemetry({ event: 'stale', reason: 'graph-mutation' })
      return request.resolve(null)
    }
    // Chunk the main-thread apply so the overlay can keep painting; a single
    // sync apply of a large worker delta freezes through the whole expand phase.
    applyingDelta = true
    const applyStartedAt = performance.now()
    void (async () => {
      try {
        await applyFigPopulationDeltaChunked(graph, result.delta, {
          budgetMs: 8,
          onChunk: (progress) => {
            // Keep the worker timeout alive across long applies.
            clearTimeout(request.timeout)
            request.timeout = setTimeout(() => fail(), FIG_POPULATION_WORKER_TIMEOUT_MS)
            request.onProgress?.({
              completed: progress.completed,
              total: progress.total,
              stage: 'overrides'
            })
          }
        })
        const context = getLazyFigImportContext(graph)
        // Only advance readiness when the worker reports a successful populate.
        // Applying populatedRootIds from an empty failed/no-op result marked pages
        // "done" on the main graph without transferring any nodes.
        if (context && result.populated) {
          context.populatedRootIds = new Set(result.delta.populatedRootIds)
        }
        request.resolve(result.populated)
        emitTelemetry({
          event: 'populate',
          durationMs: performance.now() - request.startedAt,
          applyMs: performance.now() - applyStartedAt,
          created: result.delta.created.length,
          updated: result.delta.updated.length,
          deleted: result.delta.deleted.length
        })
      } catch {
        fail()
        request.resolve(null)
      } finally {
        applyingDelta = false
        clearTimeout(request.timeout)
      }
    })()
  }
  if (port) {
    port.onmessage = (event: MessageEvent<FigSessionResponse>) =>
      receive(event.data as WorkerResult)
    port.start()
  } else {
    worker.onmessage = (event: MessageEvent<WorkerResult>) => receive(event.data)
  }
  worker.onerror = () => fail()
  return {
    populate(pageId, signal, onProgress) {
      signal?.throwIfAborted()
      if (stale) return Promise.resolve(null)
      const requestId = randomHex()
      const baseRevision = revision
      return new Promise((resolve, reject) => {
        const abort = () => {
          const request = pending.get(requestId)
          if (!request) return
          clearTimeout(request.timeout)
          pending.delete(requestId)
          fail(false)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal?.addEventListener('abort', abort, { once: true })
        const timeout = setTimeout(() => fail(), FIG_POPULATION_WORKER_TIMEOUT_MS)
        pending.set(requestId, {
          resolve,
          abort: () => signal?.removeEventListener('abort', abort),
          onProgress,
          revision: baseRevision,
          startedAt: performance.now(),
          timeout
        })
        if (port) port.postMessage({ type: 'populate', requestId, baseRevision, pageId })
        else worker.postMessage({ type: 'populate', requestId, baseRevision, pageId }, [])
      })
    },
    terminate() {
      if (disposed) return
      disposed = true
      emitTelemetry({ event: 'terminated' })
      port?.postMessage({ type: 'dispose' })
      port?.close()
      fail(false)
    }
  }
}
