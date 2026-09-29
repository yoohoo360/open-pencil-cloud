import { limitAsync } from 'es-toolkit/promise'

import { computeBounds } from '@open-pencil/scene-graph/geometry'
import type { SceneGraph } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import {
  getLazyFigImportContext,
  isLazyFigImportRootPopulated,
  listPendingLazyFigImportPages,
  materializeLazyFigImportRoots,
  materializeLazyFigImportRootsChunked,
  populateLazyFigImportRoots,
  populateLazyFigImportRootsChunked
} from '#core/kiwi/fig/lazy-import.override'
import {
  canUseFigPopulationWorker,
  createFigPopulationWorker,
  reviveFigPopulationWorker
} from '#core/kiwi/fig/population/client'
import { computeAllLayouts } from '#core/layout'
import { fontManager } from '#core/text/fonts'
import { collectGraphFontRequirements } from '#core/text/requirements'
import { missingGraphFontScripts } from '#core/text/resolved-requirements'

import { createPageViewportStore } from './page-viewports.override'
import type { EditorContext } from './types'

export interface PageSwitchProgress {
  phase: 'populating-page' | 'resolving-fonts' | 'resolving-fallbacks' | 'layout'
  detail?: string
  completed?: number
  total?: number
  /** Worker/main chunk stage — drives overlay copy (nodes vs building page). */
  stage?: 'nodes' | 'instances' | 'overrides'
}

export interface PreparePageOptions {
  onProgress?: (progress: PageSwitchProgress) => void
  signal?: AbortSignal
}

export interface PreparedPage {
  pageId: string
  generation: number
  populated: boolean
}

export type SwitchPageOptions = PreparePageOptions

function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted()
}

const MAX_CONCURRENT_FONT_LOADS = 4

function yieldForLazyPrefetch(): Promise<void> {
  return new Promise((resolve) => {
    const idle = (
      globalThis as typeof globalThis & {
        requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
      }
    ).requestIdleCallback
    if (typeof idle === 'function') {
      idle(() => resolve(), { timeout: 400 })
      return
    }
    globalThis.setTimeout(resolve, 0)
  })
}

/** Keep the shared canvas loading overlay painting between sync slices. */
function yieldForPageSwitchChunk(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0)
  })
}

const PAGE_SWITCH_MATERIALIZE_BUDGET_MS = 8
const PAGE_SWITCH_POPULATE_BUDGET_MS = 8

export function createPageActions(ctx: EditorContext) {
  const pageViewportStore = createPageViewportStore(ctx)
  let populationWorkerInstance: ReturnType<typeof createFigPopulationWorker> | undefined
  let populationWorkerGeneration = 0
  let pageSwitchGeneration = 0
  let lazyPrefetchToken = 0
  let lazyPrefetchActive = false
  const warmingPageIds = new Map<string, Promise<boolean>>()

  function populationWorker() {
    if (!canUseFigPopulationWorker(ctx.graph)) return null
    populationWorkerInstance ??= createFigPopulationWorker(ctx.graph)
    return populationWorkerInstance
  }

  function cancelLazyFigPrefetch(): void {
    lazyPrefetchToken++
    lazyPrefetchActive = false
  }

  function enableRegionalTiledPaint(): void {
    if (!getLazyFigImportContext(ctx.graph)) return
    const renderer = ctx.getRenderer()
    if (renderer) renderer.tiledSceneEnabled = true
  }

  function refreshPageAfterSilentPopulation(pageId: string): void {
    ctx.getRenderer()?.invalidateAllPictures()
    // After a large lazy page lands, paint visible world tiles first so the
    // canvas fills in by region instead of blocking on one full-scene raster.
    enableRegionalTiledPaint()
    // Layer trees listen to page:changed / node events — silent import suppresses
    // per-node emits, so force one rebuild after the batch.
    ctx.emitEditorEvent('page:changed', pageId, pageId)
    ctx.requestRender()
  }

  /** Layout after silent populate — do not flood node:updated per child. */
  function computeLayoutsSilently(pageId: string): void {
    ctx.graph.runSilentMutations(() => {
      computeAllLayouts(ctx.graph, pageId)
    })
  }

  function warmLazyFigPageSync(pageId: string): boolean {
    if (isLazyFigImportRootPopulated(ctx.graph, pageId)) return false
    const materialized = materializeLazyFigImportRoots(ctx.graph, [pageId])
    const populated = populateLazyFigImportRoots(ctx.graph, [pageId])
    if (!(materialized || populated)) return false
    computeLayoutsSilently(pageId)
    return true
  }

  async function warmLazyFigPageChunked(
    pageId: string,
    signal?: AbortSignal,
    onProgress?: PreparePageOptions['onProgress']
  ): Promise<boolean> {
    if (isLazyFigImportRootPopulated(ctx.graph, pageId)) return false

    // Loading overlay owns UX during cold switch — only push phase labels, do
    // not emit page:changed / requestRender on every chunk (that floods React
    // + layer trees). One refresh runs after the batch completes.
    const reportChunk = (info?: {
      stage?: 'materialize' | 'instances' | 'overrides'
      completed?: number
      total?: number
    }) => {
      const stage =
        info?.stage === 'instances'
          ? 'instances'
          : info?.stage === 'overrides'
            ? 'overrides'
            : 'nodes'
      onProgress?.({
        phase: 'populating-page',
        stage,
        completed: info?.completed,
        total: info?.total
      })
    }

    onProgress?.({ phase: 'populating-page', stage: 'nodes' })
    const chunkOptions = {
      materializeBudgetMs: PAGE_SWITCH_MATERIALIZE_BUDGET_MS,
      populateBudgetMs: PAGE_SWITCH_POPULATE_BUDGET_MS,
      signal,
      yieldBetween: yieldForPageSwitchChunk,
      onChunk: reportChunk
    }
    const materialized = await materializeLazyFigImportRootsChunked(
      ctx.graph,
      [pageId],
      chunkOptions
    )
    const populated = await populateLazyFigImportRootsChunked(ctx.graph, [pageId], chunkOptions)
    if (!(materialized || populated || isLazyFigImportRootPopulated(ctx.graph, pageId))) {
      return false
    }
    reportChunk({ stage: 'overrides' })
    onProgress?.({ phase: 'layout' })
    computeLayoutsSilently(pageId)
    return true
  }

  function warmLazyFigPage(pageId: string): Promise<boolean> {
    const inFlight = warmingPageIds.get(pageId)
    if (inFlight) return inFlight
    const work = Promise.resolve().then(() => {
      try {
        return warmLazyFigPageSync(pageId)
      } finally {
        warmingPageIds.delete(pageId)
      }
    })
    warmingPageIds.set(pageId, work)
    return work
  }

  /**
   * Background warm that does not bump `pageSwitchGeneration`, so an in-flight
   * user switch is not cancelled. Worker-backed graphs use populate directly;
   * main-thread lazy graphs use sync materialize.
   */
  function prefetchLazyFigPage(pageId: string): Promise<boolean> {
    const inFlight = warmingPageIds.get(pageId)
    if (inFlight) return inFlight
    const work = (async () => {
      try {
        if (isLazyFigImportRootPopulated(ctx.graph, pageId)) return false
        if (getLazyFigImportContext(ctx.graph)?.materializePage) {
          return warmLazyFigPageSync(pageId)
        }
        const generation = pageSwitchGeneration
        const populated = await populatePage(pageId, generation)
        if (populated === null || generation !== pageSwitchGeneration) return false
        return populated === true
      } finally {
        warmingPageIds.delete(pageId)
      }
    })()
    warmingPageIds.set(pageId, work)
    return work
  }

  /** After the home page is interactive, quietly expand remaining pages in idle time. */
  function prefetchRemainingLazyFigPages(): void {
    if (!getLazyFigImportContext(ctx.graph)) return
    if (lazyPrefetchActive) return
    if (listPendingLazyFigImportPages(ctx.graph).length === 0) return

    const token = ++lazyPrefetchToken
    lazyPrefetchActive = true
    void (async () => {
      try {
        while (token === lazyPrefetchToken) {
          const pending = listPendingLazyFigImportPages(ctx.graph).filter(
            (id) => !warmingPageIds.has(id)
          )
          if (pending.length === 0) return
          // Prefer pages near the current one so the next click is usually warm.
          const pages = ctx.graph.getPages()
          const currentIndex = pages.findIndex((page) => page.id === ctx.state.currentPageId)
          const ordered = [...pending].sort((a, b) => {
            const indexA = pages.findIndex((page) => page.id === a)
            const indexB = pages.findIndex((page) => page.id === b)
            const dist = (index: number) =>
              currentIndex === -1 || index === -1
                ? Number.POSITIVE_INFINITY
                : Math.abs(index - currentIndex)
            return dist(indexA) - dist(indexB)
          })
          const pageId = ordered[0]
          if (!pageId) return
          await yieldForLazyPrefetch()
          if (token !== lazyPrefetchToken) return
          if (isLazyFigImportRootPopulated(ctx.graph, pageId)) continue
          await prefetchLazyFigPage(pageId)
        }
      } finally {
        if (token === lazyPrefetchToken) lazyPrefetchActive = false
      }
    })()
  }

  async function populatePage(
    pageId: string,
    switchGeneration: number,
    signal?: AbortSignal,
    onProgress?: PreparePageOptions['onProgress']
  ): Promise<boolean | null> {
    throwIfAborted(signal)
    // Only the main-thread importer attaches `materializePage`. Worker transfer
    // stubs must fall through to the session worker instead of a no-op warm.
    if (getLazyFigImportContext(ctx.graph)?.materializePage) {
      onProgress?.({ phase: 'populating-page', stage: 'nodes' })
      const warmed = warmLazyFigPageSync(pageId)
      if (warmed) onProgress?.({ phase: 'populating-page', stage: 'overrides' })
      return warmed
    }
    const reportPopulate = (progress: {
      completed: number
      total?: number
      stage?: PageSwitchProgress['stage']
    }) => {
      onProgress?.({
        phase: 'populating-page',
        completed: progress.completed,
        total: progress.total,
        stage: progress.stage ?? 'nodes'
      })
    }

    let worker = populationWorker()
    if (!worker) {
      worker = await reviveFigPopulationWorker(ctx.graph, signal)
      populationWorkerInstance = worker ?? undefined
    }
    let workerGeneration = populationWorkerGeneration
    let workerResult = worker ? await worker.populate(pageId, signal, reportPopulate) : null
    throwIfAborted(signal)
    if (
      workerGeneration !== populationWorkerGeneration ||
      switchGeneration !== pageSwitchGeneration
    ) {
      return null
    }
    if (workerResult !== null) return workerResult

    // Stale/dead worker: revive from the retained .fig bytes and retry once.
    worker?.terminate()
    populationWorkerInstance = undefined
    populationWorkerGeneration++
    worker = await reviveFigPopulationWorker(ctx.graph, signal)
    populationWorkerInstance = worker ?? undefined
    workerGeneration = populationWorkerGeneration
    workerResult = worker ? await worker.populate(pageId, signal, reportPopulate) : null
    throwIfAborted(signal)
    if (
      workerGeneration !== populationWorkerGeneration ||
      switchGeneration !== pageSwitchGeneration
    ) {
      return null
    }
    if (workerResult !== null) return workerResult

    onProgress?.({ phase: 'populating-page', stage: 'nodes' })
    const populated = populateLazyFigImportRoots(ctx.graph, [pageId])
    if (populated) onProgress?.({ phase: 'populating-page', stage: 'overrides' })
    return populated
  }

  async function resolvePageFonts(
    pageId: string,
    pageName: string,
    options: PreparePageOptions
  ): Promise<void> {
    const childIds = ctx.graph.getChildren(pageId).map((node) => node.id)
    const toLoad = fontManager.collectFontKeys(ctx.graph, childIds)
    const requirements = collectGraphFontRequirements(ctx.graph, childIds)
    options.onProgress?.({
      phase: 'resolving-fonts',
      detail: pageName,
      completed: 0,
      total: toLoad.length
    })
    fontManager.blockNodesUntilFontsResolve(childIds)
    try {
      let completedFaces = 0
      const loadFace = limitAsync(async ([family, style]: [string, string]) => {
        throwIfAborted(options.signal)
        const result = await ctx.loadFont(family, style, requirements.characters, options.signal)
        throwIfAborted(options.signal)
        completedFaces++
        options.onProgress?.({
          phase: 'resolving-fonts',
          detail: `${family} ${style}`,
          completed: completedFaces,
          total: toLoad.length
        })
        return result
      }, MAX_CONCURRENT_FONT_LOADS)
      const results = await Promise.all(toLoad.map(loadFace))
      throwIfAborted(options.signal)
      const requiredFallbacks = missingGraphFontScripts(requirements)
      options.onProgress?.({
        phase: 'resolving-fallbacks',
        detail: pageName,
        completed: 0,
        total: requiredFallbacks.length
      })
      const fallbacks = await fontManager.ensureFallbackPack(
        requiredFallbacks,
        requirements.characters,
        options.signal
      )
      throwIfAborted(options.signal)
      options.onProgress?.({
        phase: 'resolving-fallbacks',
        detail: pageName,
        completed: requiredFallbacks.length,
        total: requiredFallbacks.length
      })
      const facesReady = results.every((result) => result !== null)
      const fallbacksReady = requiredFallbacks.every(
        (script) => (fallbacks[script]?.length ?? 0) > 0
      )
      if (facesReady && fallbacksReady) {
        for (const node of requirements.nodes) if (node.type === 'TEXT') node.textPicture = null
      }
    } finally {
      fontManager.unblockNodes(childIds)
      ctx.getRenderer()?.invalidateAllPictures()
    }
  }

  async function preparePage(
    pageId: string,
    options: PreparePageOptions = {}
  ): Promise<PreparedPage | null> {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return null
    const generation = ++pageSwitchGeneration
    throwIfAborted(options.signal)

    if (!isLazyFigImportRootPopulated(ctx.graph, pageId)) {
      cancelLazyFigPrefetch()
    }

    options.onProgress?.({ phase: 'populating-page', stage: 'nodes' })
    const populated = await populatePage(pageId, generation, options.signal, options.onProgress)
    if (populated === null || generation !== pageSwitchGeneration) return null

    if (populated) options.onProgress?.({ phase: 'layout' })
    else options.onProgress?.({ phase: 'populating-page', stage: 'nodes' })
    if (ctx.getRenderer() || populated) {
      computeLayoutsSilently(pageId)
    }
    throwIfAborted(options.signal)
    if (populated) ctx.getRenderer()?.invalidateAllPictures()
    return generation === pageSwitchGeneration ? { pageId, generation, populated } : null
  }

  function fitPageContent(pageId: string): void {
    const nodes = ctx.graph.getChildren(pageId)
    if (nodes.length === 0) return
    const bounds = computeBounds(nodes)
    const padding = 80
    const w = bounds.width + padding * 2
    const h = bounds.height + padding * 2
    if (!(w > 0) || !(h > 0)) return
    const { width: viewW, height: viewH } = ctx.getViewportSize()
    if (!(viewW > 0) || !(viewH > 0)) return
    const zoom = Math.min(viewW / w, viewH / h, 1)
    ctx.state.zoom = zoom
    ctx.state.panX = (viewW - w * zoom) / 2 - bounds.x * zoom + padding * zoom
    ctx.state.panY = (viewH - h * zoom) / 2 - bounds.y * zoom + padding * zoom
  }

  function commitPageSwitch(prepared: PreparedPage): boolean {
    if (prepared.generation !== pageSwitchGeneration) return false
    const page = ctx.graph.getNode(prepared.pageId)
    if (page?.type !== 'CANVAS') return false

    pageViewportStore.saveCurrentPageViewport()
    const previousPageId = ctx.state.currentPageId
    ctx.state.currentPageId = prepared.pageId
    ctx.state.enteredContainerId = null
    ctx.setSelectedIds(new Set())
    const restored = pageViewportStore.restorePageViewport(prepared.pageId)
    if (!restored && prepared.populated) fitPageContent(prepared.pageId)
    if (previousPageId !== prepared.pageId) {
      ctx.emitEditorEvent('page:changed', prepared.pageId, previousPageId)
    }
    ctx.requestRender()
    return true
  }

  async function switchPage(pageId: string, options: SwitchPageOptions = {}): Promise<void> {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return

    // Prefer the retained session worker when present (worker-backed imports).
    // Main-thread lazy context is used when the file was parsed without a worker.
    const hasWorker = canUseFigPopulationWorker(ctx.graph)
    const lazy = getLazyFigImportContext(ctx.graph)
    const hasLazy = lazy !== undefined
    // Chunked main-thread warm requires live materialize hooks (not a worker stub).
    const canWarmOnMainThread = !!lazy?.materializePage

    if (hasLazy && !hasWorker && canWarmOnMainThread) {
      const generation = ++pageSwitchGeneration

      // Prefetch hit: page is already expanded — just commit the camera.
      if (isLazyFigImportRootPopulated(ctx.graph, pageId)) {
        if (!commitPageSwitch({ pageId, generation, populated: true })) return
        enableRegionalTiledPaint()
        void resolvePageFonts(pageId, page.name, options)
          .then(() => {
            if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) return
            computeLayoutsSilently(pageId)
            ctx.requestRender()
          })
          .catch((error) => {
            if (options.signal?.aborted) return
            console.warn('[Editor] Page font resolution failed', error)
          })
        prefetchRemainingLazyFigPages()
        return
      }

      // Cold switch: React store owns the overlay. Yield first so it paints over
      // the previous page, then commit the empty target under that cover.
      cancelLazyFigPrefetch()
      try {
        await yieldForPageSwitchChunk()
        if (generation !== pageSwitchGeneration) return
        if (!commitPageSwitch({ pageId, generation, populated: false })) return

        await yieldForPageSwitchChunk()
        if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) return

        options.onProgress?.({ phase: 'populating-page', stage: 'nodes' })
        throwIfAborted(options.signal)
        const warmed = await warmLazyFigPageChunked(pageId, options.signal, options.onProgress)
        throwIfAborted(options.signal)
        if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) return
        if (warmed || isLazyFigImportRootPopulated(ctx.graph, pageId)) {
          options.onProgress?.({ phase: 'layout' })
          if (!pageViewportStore.hasSavedViewport(pageId)) fitPageContent(pageId)
          refreshPageAfterSilentPopulation(pageId)
        }

        void resolvePageFonts(pageId, page.name, options)
          .then(() => {
            if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) {
              return
            }
            computeLayoutsSilently(pageId)
            ctx.requestRender()
          })
          .catch((error) => {
            if (options.signal?.aborted) return
            console.warn('[Editor] Page font resolution failed', error)
          })
        prefetchRemainingLazyFigPages()
      } catch (error) {
        if (options.signal?.aborted) return
        throw error
      }
      return
    }

    try {
      const prepared = await preparePage(pageId, options)
      if (!prepared) return
      if (!commitPageSwitch(prepared)) return
      if (prepared.populated) refreshPageAfterSilentPopulation(pageId)

      const generation = prepared.generation
      void resolvePageFonts(pageId, page.name, options)
        .then(() => {
          if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) return
          computeLayoutsSilently(pageId)
          ctx.requestRender()
        })
        .catch((error) => {
          if (options.signal?.aborted) return
          console.warn('[Editor] Page font resolution failed', error)
        })
      prefetchRemainingLazyFigPages()
    } catch (error) {
      if (options.signal?.aborted) return
      throw error
    }
  }

  function clearPageViewports() {
    cancelLazyFigPrefetch()
    populationWorkerGeneration++
    pageSwitchGeneration++
    populationWorkerInstance?.terminate()
    populationWorkerInstance = undefined
    pageViewportStore.clearPageViewports()
  }

  function addPage(name?: string) {
    const pages = ctx.graph.getPages()
    const pageName = name ?? `Page ${pages.length + 1}`
    const page = ctx.graph.addPage(pageName)
    stampCreatedPageFigSource(ctx.graph, page.id)
    void switchPage(page.id)
    return page.id
  }

  function deletePage(pageId: string) {
    const pages = ctx.graph.getPages()
    if (pages.length <= 1) return
    const idx = pages.findIndex((p) => p.id === pageId)
    ctx.graph.deleteNode(pageId)
    pageViewportStore.deletePageViewport(pageId)
    if (ctx.state.currentPageId === pageId) {
      const newIdx = Math.min(idx, pages.length - 2)
      const remaining = ctx.graph.getPages()
      void switchPage(remaining[newIdx].id)
    }
  }

  function movePage(pageId: string, index: number) {
    const pages = ctx.graph.getPages()
    const currentIndex = pages.findIndex((page) => page.id === pageId)
    if (currentIndex === -1) return

    const nextIndex = Math.max(0, Math.min(index, pages.length - 1))
    if (nextIndex === currentIndex) return

    const dest = pages[nextIndex]
    if (!dest) return
    const rootIndex = ctx.graph
      .getChildren(ctx.graph.rootId)
      .findIndex((node) => node.id === dest.id)
    if (rootIndex === -1) return

    ctx.graph.insertChildAt(pageId, ctx.graph.rootId, rootIndex)
  }

  function renamePage(pageId: string, name: string) {
    ctx.graph.updateNode(pageId, { name })
  }

  function setPageColor(color: Color) {
    ctx.state.pageColor = color
    ctx.requestRender()
  }

  return {
    preparePage,
    commitPageSwitch,
    switchPage,
    prefetchRemainingLazyFigPages,
    addPage,
    deletePage,
    movePage,
    renamePage,
    setPageColor,
    clearPageViewports
  }
}

const SESSION_1_GUID = /^1:(\d+)$/

function nextLocalFigSourceId(graph: SceneGraph): string {
  let maxLocal = 0
  for (const node of graph.getAllNodes()) {
    for (const raw of [node.source.id, node.id]) {
      if (!raw) continue
      const match = SESSION_1_GUID.exec(raw)
      if (!match) continue
      maxLocal = Math.max(maxLocal, Number.parseInt(match[1], 10))
    }
  }
  return `1:${maxLocal + 1}`
}

function stampCreatedPageFigSource(graph: SceneGraph, pageId: string): void {
  const page = graph.getNode(pageId)
  if (!page || page.source.id) return
  graph.updateNode(pageId, {
    source: {
      ...page.source,
      format: 'fig',
      id: nextLocalFigSourceId(graph)
    }
  })
}
