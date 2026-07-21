import { useRef, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

import { useEventListener } from '#react/shared/dom/hooks'
import { createRafScheduler } from '#react/shared/input/raf-scheduler'

export function setupSafariGestureZoom(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor
) {
  let gestureStartZoom = 1
  let pendingGesture: { scale: number; sx: number; sy: number } | null = null

  function flushGesture() {
    if (!pendingGesture) return
    editor.setHoveredNode(null)
    const { scale, sx, sy } = pendingGesture
    pendingGesture = null
    editor.setZoomAroundPoint(gestureStartZoom * scale, sx, sy)
  }

  const gestureScheduler = createRafScheduler(flushGesture)

  useEventListener(
    canvasRef,
    'gesturestart' as keyof HTMLElementEventMap,
    (e: Event) => {
      e.preventDefault()
      gestureStartZoom = editor.state.zoom
    },
    { passive: false }
  )

  useEventListener(
    canvasRef,
    'gesturechange' as keyof HTMLElementEventMap,
    (e: Event) => {
      e.preventDefault()
      const ge = e as GestureEvent
      pendingGesture = { scale: ge.scale, sx: ge.clientX, sy: ge.clientY }
      gestureScheduler.schedule()
    },
    { passive: false }
  )

  useEventListener(
    canvasRef,
    'gestureend' as keyof HTMLElementEventMap,
    (e: Event) => {
      e.preventDefault()
      flushGesture()
    },
    { passive: false }
  )
}
