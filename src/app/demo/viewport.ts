import type { Editor } from '@open-pencil/core/editor'

type DemoViewportEditor = Pick<Editor, 'onEditorEvent' | 'zoomToFit'>

/** Fit a demo page once, then preserve the user's own viewport on return visits. */
export function fitDemoPagesOnFirstVisit(store: DemoViewportEditor, pageIds: string[]) {
  const pending = new Set(pageIds)
  const unbindPage = store.onEditorEvent('page:changed', (pageId) => {
    if (!pending.delete(pageId)) return
    store.zoomToFit()
    if (pending.size === 0) dispose()
  })
  const unbindGraph = store.onEditorEvent('graph:replaced', dispose)

  function dispose() {
    unbindPage()
    unbindGraph()
  }
  return dispose
}
