import { useRef, type MutableRefObject, type RefObject } from 'react'

import { useEventListener } from '#react/shared/dom/hooks'

import type { Editor } from '@open-pencil/core/editor'

import { startPenInput } from '#react/canvas/pen-input/use'
import { startShapeDraw, startTextDraw } from '#react/shared/input/draw'
import { startPanDrag } from '#react/shared/input/pan'
import { handleSelectDown } from '#react/shared/input/select'
import type { HitTestFns } from '#react/shared/input/select'
import type { DragState } from '#react/shared/input/types'

type ToolMouseDownOptions = {
  event: MouseEvent
  cx: number
  cy: number
  sx: number
  sy: number
  editor: Editor
  hitFns: HitTestFns
  cursorOverride: MutableRefObject<string | null>
  setDrag: (d: DragState) => void
  tryStartRotation: (cx: number, cy: number) => boolean
  handleTextEditClick: (cx: number, cy: number, shiftKey: boolean) => boolean
}

export { startPanDrag }

export function handleToolMouseDown({
  event,
  cx,
  cy,
  sx,
  sy,
  editor,
  hitFns,
  cursorOverride,
  setDrag,
  tryStartRotation,
  handleTextEditClick
}: ToolMouseDownOptions) {
  const tool = editor.state.activeTool

  if (event.button === 1 || tool === 'HAND') {
    startPanDrag(event, setDrag, editor)
    return
  }

  if (tool === 'SELECT') {
    handleSelectDown(
      event,
      cx,
      cy,
      sx,
      sy,
      editor,
      hitFns,
      tryStartRotation,
      handleTextEditClick,
      setDrag
    )
    return
  }

  if (tool === 'PEN') {
    startPenInput(event, cx, cy, editor, setDrag, cursorOverride)
    return
  }

  if (tool === 'TEXT') {
    startTextDraw(cx, cy, editor, setDrag)
    return
  }

  startShapeDraw(cx, cy, editor, setDrag)
}
