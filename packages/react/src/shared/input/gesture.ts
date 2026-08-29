import type { Editor } from '@open-pencil/core/editor'

import { joinCleanups, onRefTarget } from '#react/shared/input/events'
import { createRafScheduler } from '#react/shared/input/raf-scheduler'
import type { MutableRef } from '#react/shared/input/ref'

export function setupSafariGestureZoom(
  canvasRef: MutableRef<HTMLCanvasElement | null>,
  editor: Editor
): () => void {
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

  function onGestureStart(event: Event) {
    event.preventDefault()
    gestureStartZoom = editor.state.zoom
  }

  function onGestureChange(event: Event) {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const gesture = event as GestureEvent
    const rect = canvas.getBoundingClientRect()
    pendingGesture = {
      scale: gesture.scale,
      sx: gesture.clientX - rect.left,
      sy: gesture.clientY - rect.top
    }
    gestureScheduler.schedule()
  }

  function onGestureEnd(event: Event) {
    event.preventDefault()
  }

  return joinCleanups(
    onRefTarget(canvasRef, 'gesturestart', onGestureStart, { passive: false }),
    onRefTarget(canvasRef, 'gesturechange', onGestureChange, { passive: false }),
    onRefTarget(canvasRef, 'gestureend', onGestureEnd, { passive: false }),
    () => gestureScheduler.cancel()
  )
}
