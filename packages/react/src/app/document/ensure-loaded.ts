import { yieldToUI } from '#react/app/document/fig'
import {
  pageLoadingLabels,
  pageLoadingProgressDetail
} from '#react/app/document/page-loading/labels'
import {
  refreshPageLoadingProgress,
  setPageLoadingVisible
} from '#react/app/document/page-loading/controller'
import { pendingPageIds } from '#react/app/document/page-loading/progress'
import type { EditorStore } from '#react/app/editor/store'

/**
 * Manual save must see a fully populated document. If pages are still lazy or the
 * open overlay is up, finish remaining page loads under the shared loading UI.
 */
export async function ensureDocumentFullyLoaded(store: EditorStore): Promise<void> {
  const pending = pendingPageIds(store.graph)
  const overlayUp = store.state.pageLoading.visible || store.state.loading
  if (pending.length === 0 && !overlayUp) return

  setPageLoadingVisible(store, true, pageLoadingLabels.preparingNodes)
  await yieldToUI()

  for (const pageId of pendingPageIds(store.graph)) {
    refreshPageLoadingProgress(store, pageLoadingLabels.preparingNodes)
    await yieldToUI()
    try {
      await store.preparePage(pageId, {
        onProgress: (progress) => {
          refreshPageLoadingProgress(store, pageLoadingProgressDetail(progress))
        }
      })
    } catch (error) {
      console.warn('[Document] Failed to finish loading page before save', pageId, error)
    }
  }

  setPageLoadingVisible(store, false)
}
