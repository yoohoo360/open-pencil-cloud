import type { RefObject } from 'react'

import type { EditorStore } from '@/app/editor/active-store'

export function createCanvasContextSelection(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  store: EditorStore
) {
  function selectAtContextPoint(event: MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x: cx, y: cy } = store.screenToCanvas(
      event.clientX - rect.left,
      event.clientY - rect.top
    )
    store.selectAtPoint(cx, cy)
  }

  return { selectAtContextPoint }
}
