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
  createFigPopulationWorker
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
      idle(() => resolve(), { timeout: 1200 })
      return
    }
    globalThis.setTimeout(resolve, 250)
  })
}

/** Keep the shared canvas loading overlay painting between sync slices. */
function yieldForPageSwitchChunk(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0)
  })
}

/** Larger slices: fewer yields, finish the page sooner under the loading overlay. */
const PAGE_SWITCH_MATERIALIZE_BUDGET_MS = 200
const PAGE_SWITCH_POPULATE_BUDGET_MS = 200

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
    if (renderer) {
      renderer.tiledSceneEnabled = true
      // Force settlement waiters to observe the new page instead of a stale
      // covered=true from the previous page.
      renderer.tiledSceneCovered = false
      renderer.tiledScenePending = true
    }
  }

  /** Layout without per-node editor events / renderer invalidation storms. */
  function computeLayoutsSilently(pageId: string): void {
    ctx.graph.runSilentMutations(() => {
      computeAllLayouts(ctx.graph, pageId)
    })
  }

  function refreshPageAfterSilentPopulation(pageId: string): void {
    enableRegionalTiledPaint()
    // Single structural notify + single render after the page is fully built.
    ctx.emitEditorEvent('page:changed', pageId, pageId)
    // Repaint only — avoid bumping sceneVersion (React store snapshot) twice.
    ctx.requestRepaint()
  }

  function schedulePageFontsAndLayout(
    pageId: string,
    pageName: string,
    generation: number,
    options: SwitchPageOptions
  ): void {
    // Fonts run after the first paint so opening is not blocked on network I/O.
    void resolvePageFonts(pageId, pageName, options)
      .then(() => {
        if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) return
        computeLayoutsSilently(pageId)
        ctx.requestRender()
      })
      .catch((error) => {
        if (options.signal?.aborted) return
        console.warn('[Editor] Page font resolution failed', error)
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
    signal?: AbortSignal
  ): Promise<boolean> {
    if (isLazyFigImportRootPopulated(ctx.graph, pageId)) return false

    // No per-chunk paint/page:changed — intermediate renders are the main cost.
    const chunkOptions = {
      materializeBudgetMs: PAGE_SWITCH_MATERIALIZE_BUDGET_MS,
      populateBudgetMs: PAGE_SWITCH_POPULATE_BUDGET_MS,
      signal,
      yieldBetween: yieldForPageSwitchChunk
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

  /** After the home page is interactive, quietly expand remaining pages in idle time. */
  function prefetchRemainingLazyFigPages(): void {
    if (!getLazyFigImportContext(ctx.graph)) return
    if (lazyPrefetchActive) return
    if (listPendingLazyFigImportPages(ctx.graph).length === 0) return

    const token = ++lazyPrefetchToken
    lazyPrefetchActive = true
    void (async () => {
      try {
        // Give a short grace period, then warm nearby pages so the next click is
        // usually a fast camera switch instead of another cold populate.
        await new Promise<void>((resolve) => {
          globalThis.setTimeout(resolve, 800)
        })
        if (token !== lazyPrefetchToken) return
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
          await warmLazyFigPage(pageId)
        }
      } finally {
        if (token === lazyPrefetchToken) lazyPrefetchActive = false
      }
    })()
  }

  async function populatePage(
    pageId: string,
    switchGeneration: number,
    signal?: AbortSignal
  ): Promise<boolean | null> {
    throwIfAborted(signal)
    if (getLazyFigImportContext(ctx.graph)) {
      return warmLazyFigPageSync(pageId)
    }
    const worker = populationWorker()
    const workerGeneration = populationWorkerGeneration
    const workerResult = worker ? await worker.populate(pageId, signal) : null
    throwIfAborted(signal)
    if (
      workerGeneration !== populationWorkerGeneration ||
      switchGeneration !== pageSwitchGeneration
    ) {
      return null
    }
    if (workerResult !== null) return workerResult
    worker?.terminate()
    populationWorkerInstance = undefined
    return populateLazyFigImportRoots(ctx.graph, [pageId])
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

    options.onProgress?.({ phase: 'populating-page', detail: page.name })
    const populated = await populatePage(pageId, generation, options.signal)
    if (populated === null || generation !== pageSwitchGeneration) return null

    if (ctx.getRenderer() || populated) {
      options.onProgress?.({ phase: 'layout', detail: page.name })
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

  function commitPageSwitch(
    prepared: PreparedPage,
    options: { notify?: boolean } = {}
  ): boolean {
    if (prepared.generation !== pageSwitchGeneration) return false
    const page = ctx.graph.getNode(prepared.pageId)
    if (page?.type !== 'CANVAS') return false

    const notify = options.notify !== false
    pageViewportStore.saveCurrentPageViewport()
    const previousPageId = ctx.state.currentPageId
    ctx.state.currentPageId = prepared.pageId
    ctx.state.enteredContainerId = null
    ctx.setSelectedIds(new Set())
    const restored = pageViewportStore.restorePageViewport(prepared.pageId)
    if (!restored && prepared.populated) fitPageContent(prepared.pageId)
    // Cold populate defers notify until the page is built — avoids an empty
    // page:changed (LayerTree rebuild) + render before content exists.
    if (notify && previousPageId !== prepared.pageId) {
      ctx.emitEditorEvent('page:changed', prepared.pageId, previousPageId)
    }
    if (notify) ctx.requestRender()
    return true
  }

  async function switchPage(pageId: string, options: SwitchPageOptions = {}): Promise<void> {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return

    // Prefer the retained session worker when present (worker-backed imports).
    // Main-thread lazy context is used when the file was parsed without a worker.
    const hasWorker = canUseFigPopulationWorker(ctx.graph)
    const hasLazy = getLazyFigImportContext(ctx.graph) !== undefined

    if (hasLazy && !hasWorker) {
      const generation = ++pageSwitchGeneration

      // Prefetch hit: page is already expanded — just commit the camera.
      if (isLazyFigImportRootPopulated(ctx.graph, pageId)) {
        if (!commitPageSwitch({ pageId, generation, populated: true })) return
        enableRegionalTiledPaint()
        schedulePageFontsAndLayout(pageId, page.name, generation, options)
        prefetchRemainingLazyFigPages()
        return
      }

      // Cold switch: React store.setLoading owns the overlay; pause idle prefetch
      // so materialize work is not interleaved with background warm.
      cancelLazyFigPrefetch()
      try {
        // Defer page:changed / render until content exists (one notify at the end).
        if (!commitPageSwitch({ pageId, generation, populated: false }, { notify: false })) {
          return
        }

        await yieldForPageSwitchChunk()
        if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) return

        options.onProgress?.({ phase: 'populating-page', detail: page.name })
        throwIfAborted(options.signal)
        // Under the loading overlay, finish materialize/populate in one sync
        // burst. Chunked yields used to interleave full-canvas paints and made
        // cold switches several times slower without helping first paint.
        const warmed = warmLazyFigPageSync(pageId)
        throwIfAborted(options.signal)
        if (generation !== pageSwitchGeneration || ctx.state.currentPageId !== pageId) return
        if (warmed || isLazyFigImportRootPopulated(ctx.graph, pageId)) {
          options.onProgress?.({ phase: 'layout', detail: page.name })
          if (!pageViewportStore.hasSavedViewport(pageId)) fitPageContent(pageId)
          refreshPageAfterSilentPopulation(pageId)
        }

        // Fonts after first paint — schedule on idle so switchPage can settle.
        const fontsPageId = pageId
        const fontsName = page.name
        const fontsGeneration = generation
        const fontsOptions = options
        const scheduleFonts = () =>
          schedulePageFontsAndLayout(fontsPageId, fontsName, fontsGeneration, fontsOptions)
        const idle = (
          globalThis as typeof globalThis & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number
          }
        ).requestIdleCallback
        if (typeof idle === 'function') idle(scheduleFonts, { timeout: 1200 })
        else globalThis.setTimeout(scheduleFonts, 0)
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
      schedulePageFontsAndLayout(pageId, page.name, generation, options)
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
