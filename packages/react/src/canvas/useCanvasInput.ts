import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

type PaddingEdit = {
  nodeId: string
  side: 'top' | 'right' | 'bottom' | 'left'
  value: number
  previous: number
} | null

/**
 * Simplified canvas pointer wiring: pan/zoom plus click-to-select.
 *
 * Full Vue `useCanvasInput` (draw tools, transform handles, pen, text) is not
 * ported yet; this keeps EditorCanvas interactive for the React example shell.
 */
export function useCanvasInput(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  hitTestSectionTitle: (cx: number, cy: number) => unknown,
  hitTestComponentLabel: (cx: number, cy: number) => unknown,
  hitTestFrameTitle: (cx: number, cy: number) => unknown,
  onCursorMove?: (cx: number, cy: number) => void,
  onActivate?: () => void,
  isEnabled: () => boolean = () => true
) {
  void hitTestSectionTitle
  void hitTestComponentLabel
  void hitTestFrameTitle

  const [cursorOverride, setCursorOverride] = useState<string | null>(null)
  const autoLayoutPaddingEdit = useRef<PaddingEdit>(null)
  const panRef = useRef<{
    startScreenX: number
    startScreenY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  const isEnabledRef = useRef(isEnabled)
  isEnabledRef.current = isEnabled
  const onActivateRef = useRef(onActivate)
  onActivateRef.current = onActivate
  const onCursorMoveRef = useRef(onCursorMove)
  onCursorMoveRef.current = onCursorMove

  const cleanupInteractions = useCallback(() => {
    panRef.current = null
    setCursorOverride(null)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function canvasPoint(event: PointerEvent | WheelEvent) {
      const rect = canvas.getBoundingClientRect()
      return { cx: event.clientX - rect.left, cy: event.clientY - rect.top }
    }

    function onWheel(event: WheelEvent) {
      if (!isEnabledRef.current()) return
      event.preventDefault()
      onActivateRef.current?.()
      const point = canvasPoint(event)
      if (event.ctrlKey || event.metaKey) {
        editor.applyZoom(event.deltaY, point.cx, point.cy)
        return
      }
      editor.pan(-event.deltaX, -event.deltaY)
    }

    function onPointerDown(event: PointerEvent) {
      if (!isEnabledRef.current() || event.button !== 0) return
      onActivateRef.current?.()
      const point = canvasPoint(event)
      canvas.setPointerCapture(event.pointerId)
      if (editor.state.activeTool === 'HAND' || event.altKey) {
        panRef.current = {
          startScreenX: event.clientX,
          startScreenY: event.clientY,
          startPanX: editor.state.panX,
          startPanY: editor.state.panY
        }
        setCursorOverride('grabbing')
        return
      }
      if (editor.state.activeTool === 'SELECT') {
        editor.selectAtPoint(point.cx, point.cy)
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (!isEnabledRef.current()) return
      const point = canvasPoint(event)
      onCursorMoveRef.current?.(point.cx, point.cy)
      const pan = panRef.current
      if (!pan) return
      editor.state.panX = pan.startPanX + (event.clientX - pan.startScreenX)
      editor.state.panY = pan.startPanY + (event.clientY - pan.startScreenY)
      editor.requestRepaint()
    }

    function onPointerUp(event: PointerEvent) {
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      cleanupInteractions()
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
    }
  }, [canvasRef, cleanupInteractions, editor])

  return {
    cursorOverride,
    autoLayoutPaddingEdit: autoLayoutPaddingEdit.current,
    updateAutoLayoutPaddingEdit: (_value: number) => {},
    commitAutoLayoutPaddingEdit: (_value: number) => {},
    cancelAutoLayoutPaddingEdit: () => {},
    cleanupInteractions
  }
}
