import { useRef, type MutableRefObject, type RefObject } from 'react'

import { useEventListener } from '#react/shared/dom/hooks'

import { PEN_CLOSE_THRESHOLD } from '@open-pencil/core/constants'
import type { Editor } from '@open-pencil/core/editor'

import { createPenDrag, handlePenDragMove } from '#react/canvas/pen-input/drag'
import { handlePenNodeEditDown } from '#react/shared/input/node-edit'
import type { DragState } from '#react/shared/input/types'

type SetDrag = (drag: DragState) => void

export function startPenInput(
  e: MouseEvent,
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: SetDrag,
  cursorOverride: MutableRefObject<string | null>
): boolean {
  editor.state.penCursorX = null
  editor.state.penCursorY = null

  const nodeEditState = editor.state.nodeEditState
  if (nodeEditState) {
    handlePenNodeEditDown(e, cx, cy, editor)
    return true
  }

  const penState = editor.state.penState
  if (penState && penState.vertices.length > 2) {
    const first = penState.vertices[0]
    const dist = Math.hypot(cx - first.x, cy - first.y)
    if (dist < PEN_CLOSE_THRESHOLD) {
      editor.penSetPendingClose(true)
      editor.penSetClosingToFirst(true)
      setDrag(createPenDrag(first.x, first.y))
      cursorOverride.current = 'crosshair'
      return true
    }
  }

  editor.penSetPendingClose(false)
  editor.penAddVertex(cx, cy)
  setDrag(createPenDrag(cx, cy))
  cursorOverride.current = 'crosshair'
  return true
}

export function updatePenHover(cx: number, cy: number, editor: Editor): boolean {
  if (editor.state.activeTool !== 'PEN' || !editor.state.penState) return false
  editor.state.penCursorX = cx
  editor.state.penCursorY = cy

  const first = editor.state.penState.vertices[0]
  if (editor.state.penState.vertices.length > 2) {
    const dist = Math.hypot(cx - first.x, cy - first.y)
    editor.penSetClosingToFirst(dist < PEN_CLOSE_THRESHOLD)
  }
  editor.requestRepaint()
  return true
}

export { handlePenDragMove }
