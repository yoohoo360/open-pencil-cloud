import { hitTestGuides } from '@open-pencil/core/canvas'
import type { RefObject } from 'react'

import type { EditorStore } from '#react/app/editor/store'

export function createCanvasContextSelection(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  store: EditorStore
) {
  function selectAtContextPoint(event: MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = event.clientX - rect.left
    const sy = event.clientY - rect.top
    const guide = hitTestGuides(
      store.graph,
      store.state.currentPageId,
      {
        panX: store.state.panX,
        panY: store.state.panY,
        zoom: store.state.zoom,
        width: rect.width,
        height: rect.height
      },
      sx,
      sy
    )
    if (guide) {
      store.setSelectedGuide({ ownerId: guide.ownerId, guideId: guide.guideId })
      return
    }
    store.setSelectedGuide(null)
    const { x: cx, y: cy } = store.screenToCanvas(sx, sy)
    store.selectAtPoint(cx, cy)
  }

  return { selectAtContextPoint }
}
