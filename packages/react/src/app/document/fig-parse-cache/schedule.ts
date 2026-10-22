import { yieldWhenIdle } from '#react/app/document/fig'
import { writeFigParseCache } from '#react/app/document/fig-parse-cache/idb'
import { snapshotFigParseGraph } from '#react/app/document/fig-parse-cache/snapshot'
import {
  normalizeFigParseCacheUpdatedAt,
  type FigParseCacheIdentity
} from '#react/app/document/fig-parse-cache/types'
import type { EditorStore } from '#react/app/editor/store'

/** After open overlay settles, wait this long before writing the parse cache. */
export const FIG_PARSE_CACHE_OPEN_WRITE_DELAY_MS = 20_000

/** After a successful manual cloud save, wait this long before writing. */
export const FIG_PARSE_CACHE_SAVE_WRITE_DELAY_MS = 5_000

/** Retry delay when the editor is still busy at flush time. */
const BUSY_RETRY_MS = 2_000

type PendingWrite = {
  documentKey: string
  updatedAt: string
  sceneVersion: number
  timer: ReturnType<typeof setTimeout>
  generation: number
}

const pendingByStore = new WeakMap<EditorStore, PendingWrite>()
let nextGeneration = 0

function estimateByteLength(store: EditorStore): number {
  let total = 1
  for (const bytes of store.graph.images.values()) total += bytes.byteLength
  return total
}

function resolveIdentity(
  identity: FigParseCacheIdentity
): { documentKey: string; updatedAt: string } | null {
  const documentKey = identity.documentKey.trim()
  const updatedAt = normalizeFigParseCacheUpdatedAt(identity.updatedAt)
  if (!documentKey || !updatedAt) return null
  return { documentKey, updatedAt }
}

function isEditorBusy(store: EditorStore): boolean {
  return Boolean(
    store.state.loading || store.state.pageLoading.visible || store.state.historyPreviewId
  )
}

export function cancelScheduledFigParseCacheWrite(store: EditorStore): void {
  const pending = pendingByStore.get(store)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingByStore.delete(store)
}

function armTimer(
  store: EditorStore,
  documentKey: string,
  updatedAt: string,
  sceneVersion: number,
  delayMs: number
): void {
  cancelScheduledFigParseCacheWrite(store)
  const generation = ++nextGeneration
  const timer = setTimeout(() => {
    void flushFigParseCacheWrite(store, documentKey, updatedAt, sceneVersion, generation)
  }, delayMs)
  pendingByStore.set(store, { documentKey, updatedAt, sceneVersion, timer, generation })
}

async function flushFigParseCacheWrite(
  store: EditorStore,
  documentKey: string,
  updatedAt: string,
  sceneVersion: number,
  generation: number
): Promise<void> {
  const pending = pendingByStore.get(store)
  if (!pending || pending.generation !== generation) return
  pendingByStore.delete(store)

  if (store.state.documentKey.trim() !== documentKey) return
  if (store.state.sceneVersion !== sceneVersion) return

  if (isEditorBusy(store)) {
    armTimer(store, documentKey, updatedAt, sceneVersion, BUSY_RETRY_MS)
    return
  }

  try {
    // Snapshot + IDB are background-only — wait for idle, never steal input frames.
    await yieldWhenIdle()
    // A newer schedule replaced this flush while we yielded.
    if (pendingByStore.has(store)) return
    if (store.state.documentKey.trim() !== documentKey) return
    if (store.state.sceneVersion !== sceneVersion) return
    if (isEditorBusy(store)) {
      armTimer(store, documentKey, updatedAt, sceneVersion, BUSY_RETRY_MS)
      return
    }

    const payload = snapshotFigParseGraph(store.graph)
    await yieldWhenIdle(500)
    if (pendingByStore.has(store)) return
    if (store.state.documentKey.trim() !== documentKey) return
    if (store.state.sceneVersion !== sceneVersion) return
    if (isEditorBusy(store)) {
      armTimer(store, documentKey, updatedAt, sceneVersion, BUSY_RETRY_MS)
      return
    }
    const name = store.state.documentName?.trim()
    await writeFigParseCache(payload, {
      identity: { documentKey, updatedAt },
      fileName: name ? `${name}.fig` : null,
      byteLength: estimateByteLength(store)
    })
  } catch (error) {
    console.warn('[FigParseCache] Deferred write failed', error)
  }
}

/**
 * Schedule a background IndexedDB write after `delayMs`.
 * Cancels any prior pending write for this store. Skips at flush if the scene
 * changed, the document key changed, or the editor is still loading (then retries).
 */
export function scheduleFigParseCacheWrite(
  store: EditorStore,
  identity: FigParseCacheIdentity,
  delayMs: number
): void {
  const resolved = resolveIdentity(identity)
  if (!resolved) return
  armTimer(store, resolved.documentKey, resolved.updatedAt, store.state.sceneVersion, delayMs)
}

/** Test helper: clear generation bookkeeping between suites. */
export function resetFigParseCacheScheduleForTests(): void {
  nextGeneration = 0
}
