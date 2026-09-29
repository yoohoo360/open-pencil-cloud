import { yieldToUI } from '#react/app/document/fig'
import {
  pageLoadingLabels,
  pageLoadingProgressDetail
} from '#react/app/document/page-loading/labels'
import {
  countPopulatedPages,
  pageLoadingFromGraph,
  pendingPageIds
} from '#react/app/document/page-loading/progress'
import {
  estimatePageSwitchLoadingMs,
  sleepMs
} from '#react/app/document/page-loading/switch-duration'
import { estimatePageSwitchNodeWork } from '#react/app/document/page-loading/switch-work'
import { OPEN_READY_PAGE_COUNT } from '#react/app/document/page-loading/types'
import type { EditorStore } from '#react/app/editor/store'
import { isLazyFigImportRootPopulated } from '#core/kiwi/fig/lazy-import.override'

function publish(store: EditorStore, detail: string | null, visible: boolean): void {
  store.state.pageLoading = pageLoadingFromGraph(store.graph, detail, visible)
  store.notify()
}

/**
 * True while document open should blank the page/layer trees.
 * Canvas-only phases (expand components / fonts / layout) keep those trees visible.
 */
export function isSidebarTreeLoading(store: EditorStore): boolean {
  if (!store.state.loading) return false
  const detail = store.state.pageLoading.detail ?? ''
  if (
    detail === pageLoadingLabels.expandingComponents ||
    detail === pageLoadingLabels.resolvingFonts ||
    detail === pageLoadingLabels.computingLayout ||
    detail === pageLoadingLabels.preparingCanvas
  ) {
    return false
  }
  return true
}

/** Begin / update the shared page-loading overlay (FIG open + cold page switch). */
export function setPageLoadingVisible(
  store: EditorStore,
  visible: boolean,
  detail?: string | null,
  options?: { blockShell?: boolean }
): void {
  publish(store, detail ?? store.state.pageLoading.detail, visible)
  // Cold page switch: canvas overlay only — keep page/layer trees interactive.
  if (options?.blockShell === false) {
    if (store.state.loading) {
      store.state.loading = false
      store.notify()
    }
    return
  }
  if (store.state.loading !== visible) {
    store.state.loading = visible
    store.notify()
  }
}

/**
 * Pre-graph open phases (download / decode): indeterminate bar + status text,
 * without a misleading page count from the empty editor graph.
 */
export function setPageLoadingPhase(store: EditorStore, detail: string | null): void {
  store.state.pageLoading = {
    visible: true,
    completed: 0,
    total: 0,
    detail
  }
  store.state.loading = true
  store.notify()
}

export function refreshPageLoadingProgress(store: EditorStore, detail?: string | null): void {
  if (!store.state.pageLoading.visible) return
  publish(store, detail ?? store.state.pageLoading.detail, true)
}

/**
 * After the first page is interactive, warm until `OPEN_READY_PAGE_COUNT` pages
 * are ready, then hide the overlay. Remaining pages idle-prefetch.
 */
export async function warmPagesUntilOpenReady(store: EditorStore): Promise<void> {
  const pages = store.graph.getPages()
  const total = pages.length
  if (total === 0) {
    setPageLoadingVisible(store, false)
    return
  }

  const target = Math.min(OPEN_READY_PAGE_COUNT, total)
  const order = [
    store.state.currentPageId,
    ...pages.map((page) => page.id).filter((id) => id !== store.state.currentPageId)
  ].filter((id): id is string => !!id)

  const warmIds = order.slice(0, target)
  setPageLoadingVisible(store, true, pageLoadingLabels.preparingNodes)

  for (const pageId of warmIds) {
    const { completed } = countPopulatedPages(store.graph)
    if (completed >= target) break
    if (isLazyFigImportRootPopulated(store.graph, pageId)) continue

    refreshPageLoadingProgress(store, pageLoadingLabels.preparingNodes)
    await yieldToUI()
    try {
      await store.preparePage(pageId, {
        onProgress: (progress) => {
          refreshPageLoadingProgress(store, pageLoadingProgressDetail(progress))
        }
      })
    } catch (error) {
      console.warn('[PageLoading] Failed to warm page', pageId, error)
    }
    refreshPageLoadingProgress(store, pageLoadingLabels.preparingNodes)
  }

  setPageLoadingVisible(store, false)
  store.prefetchRemainingLazyFigPages?.()
}

/** Canvas overlay while switching pages (cold or warm) — does not blank page/layer trees. */
export async function runColdPageSwitchWithProgress(
  store: EditorStore,
  pageId: string,
  switchPage: (pageId: string) => Promise<void>
): Promise<void> {
  const fromPageId = store.state.currentPageId
  const { total } = estimatePageSwitchNodeWork(store.graph, fromPageId, pageId)
  const holdMs = estimatePageSwitchLoadingMs(total)
  const startedAt = globalThis.performance?.now() ?? Date.now()

  // Caller may already have shown the overlay synchronously; keep it visible and
  // wait two frames so it paints over the previous page before nodes are cleared.
  if (!store.state.pageLoading.visible) {
    setPageLoadingVisible(store, true, pageLoadingLabels.preparingNodes, { blockShell: false })
  }
  await yieldToUI()
  await yieldToUI()
  try {
    await switchPage(pageId)
    if (store.state.pageLoading.visible) {
      refreshPageLoadingProgress(store, pageLoadingLabels.preparingCanvas)
      await yieldToUI()
    }
    // Hold at least the estimated window (1–8s) so small pages do not flash
    // and large pages keep a predictable loading beat while work finishes.
    const elapsed = (globalThis.performance?.now() ?? Date.now()) - startedAt
    if (elapsed < holdMs) await sleepMs(holdMs - elapsed)
  } finally {
    setPageLoadingVisible(store, false, null, { blockShell: false })
  }
}

export function describePendingWarmup(store: EditorStore): string {
  const pending = pendingPageIds(store.graph).length
  return pending > 0 ? `${pending} pending` : 'ready'
}
