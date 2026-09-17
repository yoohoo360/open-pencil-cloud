import {
  createOverridePipeline,
  populateAndApplyOverrides
} from '@open-pencil/fig/instance-overrides'
import type { InstanceNodeChange } from '@open-pencil/fig/instance-overrides'
import type { SceneGraph } from '@open-pencil/scene-graph'

export interface LazyFigImportContext {
  changeMap: Map<string, InstanceNodeChange>
  guidToNodeId: Map<string, string>
  blobs: Uint8Array[]
  populatedRootIds: Set<string>
  parentMap: Map<string, string>
  childrenMap: Map<string, string[]>
  canvasIdToPageId: Map<string, string>
  created: Set<string>
  materializedPageIds: Set<string>
  /** Create missing page/component scene nodes before override population. */
  materializePage?: (pageId: string) => void
  /**
   * Advance page materialization by at most `budgetMs`. Returns true when the
   * page (and referenced components) are fully built.
   */
  materializePageChunk?: (pageId: string, budgetMs: number) => boolean
}

export interface LazyFigChunkOptions {
  materializeBudgetMs?: number
  populateBudgetMs?: number
  signal?: AbortSignal
  yieldBetween?: () => Promise<void>
  /** Called after each time-sliced chunk so the host can paint under a loading overlay. */
  onChunk?: () => void | Promise<void>
}

const LAZY_FIG_IMPORT = Symbol.for('open-pencil.lazyFigImport')

type GraphWithLazyFig = SceneGraph & {
  [LAZY_FIG_IMPORT]?: LazyFigImportContext
}

const lazyFigImportContexts = new WeakMap<SceneGraph, LazyFigImportContext>()

const DEFAULT_MATERIALIZE_BUDGET_MS = 8
const DEFAULT_POPULATE_BUDGET_MS = 8

function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted()
}

async function defaultYieldBetween(): Promise<void> {
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0)
  })
}

export function setLazyFigImportContext(graph: SceneGraph, context: LazyFigImportContext): void {
  const existing = getLazyFigImportContext(graph)
  const merged: LazyFigImportContext = existing ? { ...existing, ...context } : context
  // Partial transfers must not drop the live materializePage hook / hierarchy maps.
  if (!merged.materializePage && existing?.materializePage) {
    merged.materializePage = existing.materializePage
  }
  if (!merged.materializePageChunk && existing?.materializePageChunk) {
    merged.materializePageChunk = existing.materializePageChunk
  }
  if (!merged.parentMap && existing?.parentMap) merged.parentMap = existing.parentMap
  if (!merged.childrenMap && existing?.childrenMap) merged.childrenMap = existing.childrenMap
  if (!merged.canvasIdToPageId && existing?.canvasIdToPageId) {
    merged.canvasIdToPageId = existing.canvasIdToPageId
  }
  if (!merged.created && existing?.created) merged.created = existing.created
  if (!merged.materializedPageIds && existing?.materializedPageIds) {
    merged.materializedPageIds = existing.materializedPageIds
  }
  lazyFigImportContexts.set(graph, merged)
  // Pin on the graph so duplicate module instances still see the same context.
  ;(graph as GraphWithLazyFig)[LAZY_FIG_IMPORT] = merged
}

export function getLazyFigImportContext(graph: SceneGraph): LazyFigImportContext | undefined {
  return lazyFigImportContexts.get(graph) ?? (graph as GraphWithLazyFig)[LAZY_FIG_IMPORT]
}

export function clearLazyFigImportContext(graph: SceneGraph): void {
  lazyFigImportContexts.delete(graph)
  delete (graph as GraphWithLazyFig)[LAZY_FIG_IMPORT]
}

export function materializeLazyFigImportRoots(
  graph: SceneGraph,
  rootIds: Iterable<string>
): boolean {
  const context = getLazyFigImportContext(graph)
  if (!context?.materializePage) return false
  let changed = false
  graph.runSilentMutations(() => {
    for (const pageId of rootIds) {
      if (!pageId || context.materializedPageIds.has(pageId)) continue
      const before = context.materializedPageIds.size
      context.materializePage(pageId)
      if (context.materializedPageIds.size !== before) changed = true
    }
  })
  return changed
}

/**
 * Drive page materialization in wall-clock slices so a loading overlay can keep
 * painting instead of freezing on a multi-second sync walk.
 */
export async function materializeLazyFigImportRootsChunked(
  graph: SceneGraph,
  rootIds: Iterable<string>,
  options: LazyFigChunkOptions = {}
): Promise<boolean> {
  const context = getLazyFigImportContext(graph)
  if (!context?.materializePage) return false
  const budgetMs = options.materializeBudgetMs ?? DEFAULT_MATERIALIZE_BUDGET_MS
  const yieldBetween = options.yieldBetween ?? defaultYieldBetween
  const pending = [...rootIds].filter((id) => id && !context.materializedPageIds.has(id))
  if (pending.length === 0) return false

  const chunk = context.materializePageChunk
  if (!chunk) {
    return materializeLazyFigImportRoots(graph, pending)
  }

  let changed = false
  for (const pageId of pending) {
    for (;;) {
      throwIfAborted(options.signal)
      let done = false
      graph.runSilentMutations(() => {
        done = chunk(pageId, budgetMs)
      })
      changed = true
      await options.onChunk?.()
      if (done) break
      await yieldBetween()
    }
  }
  return changed
}

function applyPopulation(
  graph: SceneGraph,
  context: LazyFigImportContext,
  rootIds?: string[]
): void {
  if (!context.materializePage) {
    console.warn('[Fig] Lazy import context is missing materializePage; skip population')
    return
  }
  graph.runSilentMutations(() => {
    if (rootIds) {
      for (const pageId of rootIds) context.materializePage?.(pageId)
    } else {
      for (const page of graph.getPages(true)) context.materializePage?.(page.id)
    }
    graph.preserveSourceMetadataDuring(() => {
      populateAndApplyOverrides(
        graph,
        context.changeMap,
        context.guidToNodeId,
        context.blobs,
        rootIds
      )
    })
  })
  const populatedRootIds = rootIds ?? graph.getPages(true).map((page) => page.id)
  for (const id of populatedRootIds) context.populatedRootIds.add(id)
}

function populateRoots(
  graph: SceneGraph,
  context: LazyFigImportContext,
  rootIds: Iterable<string>
): boolean {
  if (!context.materializePage) return false
  const pending = [...rootIds].filter((id) => id && !context.populatedRootIds.has(id))
  if (pending.length === 0) return false
  applyPopulation(graph, context, pending)
  return true
}

export function populateLazyFigImportRoots(graph: SceneGraph, rootIds: Iterable<string>): boolean {
  const context = getLazyFigImportContext(graph)
  return context ? populateRoots(graph, context, rootIds) : false
}

/**
 * Expand instances and apply overrides in budgeted slices. Call after the page
 * structure has been materialized (chunked or sync).
 */
export async function populateLazyFigImportRootsChunked(
  graph: SceneGraph,
  rootIds: Iterable<string>,
  options: LazyFigChunkOptions = {}
): Promise<boolean> {
  const context = getLazyFigImportContext(graph)
  if (!context?.materializePage) return false
  const pending = [...rootIds].filter((id) => id && !context.populatedRootIds.has(id))
  if (pending.length === 0) return false

  const budgetMs = options.populateBudgetMs ?? DEFAULT_POPULATE_BUDGET_MS
  const yieldBetween = options.yieldBetween ?? defaultYieldBetween

  // Finish any remaining structure work before the override pipeline starts.
  await materializeLazyFigImportRootsChunked(graph, pending, options)

  const pipeline = createOverridePipeline(
    graph,
    context.changeMap,
    context.guidToNodeId,
    context.blobs,
    pending
  )

  while (true) {
    throwIfAborted(options.signal)
    let done = false
    graph.runSilentMutations(() => {
      graph.preserveSourceMetadataDuring(() => {
        done = pipeline.advancePopulation(budgetMs)
      })
    })
    await options.onChunk?.()
    if (done) break
    await yieldBetween()
  }

  while (true) {
    throwIfAborted(options.signal)
    let done = false
    graph.runSilentMutations(() => {
      graph.preserveSourceMetadataDuring(() => {
        done = pipeline.advanceOverrides()
      })
    })
    await options.onChunk?.()
    if (done) break
    await yieldBetween()
  }

  for (const id of pending) context.populatedRootIds.add(id)
  return true
}

export function isLazyFigImportRootPopulated(graph: SceneGraph, rootId: string): boolean {
  const context = getLazyFigImportContext(graph)
  return context?.populatedRootIds.has(rootId) === true
}

/** User-visible pages that still need lazy materialize + instance expansion. */
export function listPendingLazyFigImportPages(graph: SceneGraph): string[] {
  const context = getLazyFigImportContext(graph)
  if (!context?.materializePage) return []
  return graph
    .getPages()
    .map((page) => page.id)
    .filter((id) => id && !context.populatedRootIds.has(id))
}

export function populateAllLazyFigImportRoots(graph: SceneGraph): boolean {
  const context = getLazyFigImportContext(graph)
  if (!context?.materializePage) return false
  const rootIds = graph.getPages(true).map((page) => page.id)
  if (rootIds.every((id) => context.populatedRootIds.has(id))) return false

  applyPopulation(graph, context)
  return true
}
