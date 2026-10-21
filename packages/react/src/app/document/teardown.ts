import { clearAllDocumentBusy } from '#react/app/document/busy/store'
import { cancelScheduledFigParseCacheWrite } from '#react/app/document/fig-parse-cache/schedule'
import { setPageLoadingVisible } from '#react/app/document/page-loading/controller'
import type { EditorStore } from '#react/app/editor/store'

/**
 * Leave the design page (or abort an in-flight open): stop background page warm /
 * population workers, drop busy-bar work, unload document fonts without rebuilding
 * CanvasKit providers (the canvas is going away).
 */
export async function teardownDocumentSession(store: EditorStore): Promise<void> {
  clearAllDocumentBusy()
  cancelScheduledFigParseCacheWrite(store)
  setPageLoadingVisible(store, false)
  store.releaseDocumentWork()
  await store.unloadDocumentFonts({ recreateProviders: false })
}
