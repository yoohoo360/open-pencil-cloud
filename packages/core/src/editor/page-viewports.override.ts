import { getPageColor } from '#core/figma-api/page-backgrounds'
import type { ViewportTransform } from '#core/geometry/types'

import type { EditorContext } from './types'

export function createPageViewportStore(ctx: EditorContext) {
  const pageViewports = new Map<string, ViewportTransform>()

  function saveCurrentPageViewport() {
    pageViewports.set(ctx.state.currentPageId, {
      panX: ctx.state.panX,
      panY: ctx.state.panY,
      zoom: ctx.state.zoom
    })
  }

  function restorePageViewport(pageId: string): boolean {
    ctx.state.pageColor = getPageColor(ctx.graph.getNode(pageId))
    const viewport = pageViewports.get(pageId)
    if (viewport) {
      ctx.state.panX = viewport.panX
      ctx.state.panY = viewport.panY
      ctx.state.zoom = viewport.zoom
      return true
    }

    ctx.state.panX = 0
    ctx.state.panY = 0
    ctx.state.zoom = 1
    return false
  }

  function hasSavedViewport(pageId: string): boolean {
    return pageViewports.has(pageId)
  }

  function deletePageViewport(pageId: string) {
    pageViewports.delete(pageId)
  }

  function clearPageViewports() {
    pageViewports.clear()
  }

  return {
    saveCurrentPageViewport,
    restorePageViewport,
    hasSavedViewport,
    deletePageViewport,
    clearPageViewports
  }
}
