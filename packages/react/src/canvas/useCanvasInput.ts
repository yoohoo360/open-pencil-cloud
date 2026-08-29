import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneNode } from '@open-pencil/scene-graph'

import { createGuideInput, selectedTopLevelGuideFrameId } from '#react/canvas/guides/input'
import { handlePenDragMove, updatePenHover } from '#react/canvas/pen/input'
import { createCanvasPointer } from '#react/canvas/pointer/use'
import { createTextEditInput } from '#react/canvas/text-edit/input'
import { handleToolMouseDown } from '#react/canvas/tools/input'
import { createCanvasTransformInput } from '#react/canvas/transform/input'
import {
  handleBendHandleMove,
  handleNodeEditPointerUp,
  updateNodeEditHover
} from '#react/canvas/vector-input/input'
import { joinCleanups, onRefTarget, onTarget } from '#react/shared/input/events'
import { resolveAutoLayoutHover } from '#react/shared/input/auto-layout-hover'
import { createClickCounter } from '#react/shared/input/click-count'
import { handleDrawMove, handleDrawUp } from '#react/shared/input/draw'
import { handleMoveMove, handleMoveUp } from '#react/shared/input/move'
import { setupPanZoom } from '#react/shared/input/pan-zoom'
import type { MutableRef } from '#react/shared/input/ref'
import { applyResize, commitResizePreview } from '#react/shared/input/resize'
import { updateHoverCursor } from '#react/shared/input/select'
import { setupSpaceHeld } from '#react/shared/input/space-key'
import type { DragState } from '#react/shared/input/types'
import { handleNodeEditMove } from '#react/shared/input/vector'

type PaddingEdit = {
  nodeId: string
  side: 'top' | 'right' | 'bottom' | 'left'
  value: number
  previous: number
} | null

type HitTest = (cx: number, cy: number) => SceneNode | null

/**
 * Wires pointer and mouse interaction to an OpenPencil canvas.
 *
 * Coordinates selection, dragging, resizing, rotation, panning, drawing tools,
 * scoped hit testing, and text-edit interaction for editor shell canvases.
 */
export function useCanvasInput(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  hitTestSectionTitle: HitTest,
  hitTestComponentLabel: HitTest,
  hitTestFrameTitle: HitTest,
  onCursorMove?: (cx: number, cy: number) => void,
  onActivate?: () => void,
  isEnabled: () => boolean = () => true
) {
  const drag = useRef<DragState | null>(null)
  const [cursorOverride, setCursorOverride] = useState<string | null>(null)
  const cursorOverrideRef = useRef<string | null>(null)
  const autoLayoutPaddingEdit = useRef<PaddingEdit>(null)
  const selectedIdsBeforeClickSequence = useRef<ReadonlySet<string>>(new Set())
  const lastPointer = useRef<{ cx: number; cy: number } | null>(null)
  const pointerInside = useRef(false)
  const spaceHeld = useRef(false)
  const altHeld = useRef(false)
  const metaHeld = useRef(false)
  const controlHeld = useRef(false)
  const isEnabledRef = useRef(isEnabled)
  const onActivateRef = useRef(onActivate)
  const onCursorMoveRef = useRef(onCursorMove)
  const hitsRef = useRef({ hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle })

  isEnabledRef.current = isEnabled
  onActivateRef.current = onActivate
  onCursorMoveRef.current = onCursorMove
  hitsRef.current = { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle }

  const applyCursor = useCallback((next: string | null) => {
    if (cursorOverrideRef.current === next) return
    cursorOverrideRef.current = next
    setCursorOverride(next)
  }, [])

  const cursorOverrideProxy: MutableRef<string | null> = {
    get current() {
      return cursorOverrideRef.current
    },
    set current(value) {
      applyCursor(value)
    }
  }

  function paddingValue(node: SceneNode, side: 'top' | 'right' | 'bottom' | 'left') {
    if (side === 'top') return node.paddingTop
    if (side === 'right') return node.paddingRight
    if (side === 'bottom') return node.paddingBottom
    return node.paddingLeft
  }

  function paddingKey(side: 'top' | 'right' | 'bottom' | 'left') {
    if (side === 'top') return 'paddingTop' as const
    if (side === 'right') return 'paddingRight' as const
    if (side === 'bottom') return 'paddingBottom' as const
    return 'paddingLeft' as const
  }

  function updateAutoLayoutPaddingEdit(value: number) {
    const edit = autoLayoutPaddingEdit.current
    if (!edit || !Number.isFinite(value)) return
    const next = Math.max(0, value)
    autoLayoutPaddingEdit.current = { ...edit, value: next }
    editor.updateNode(edit.nodeId, { [paddingKey(edit.side)]: next })
  }

  function commitAutoLayoutPaddingEdit(value: number) {
    const edit = autoLayoutPaddingEdit.current
    if (!edit || !Number.isFinite(value)) {
      autoLayoutPaddingEdit.current = null
      return
    }
    const next = Math.max(0, value)
    editor.updateNode(edit.nodeId, { [paddingKey(edit.side)]: edit.previous })
    editor.updateNodeWithUndo(edit.nodeId, { [paddingKey(edit.side)]: next }, 'Update padding')
    autoLayoutPaddingEdit.current = null
  }

  function cancelAutoLayoutPaddingEdit() {
    const edit = autoLayoutPaddingEdit.current
    if (edit) editor.updateNode(edit.nodeId, { [paddingKey(edit.side)]: edit.previous })
    autoLayoutPaddingEdit.current = null
  }

  function resetMeasurementModifiers() {
    altHeld.current = false
    metaHeld.current = false
    controlHeld.current = false
    editor.setMeasurementMode('off')
  }

  const cleanupInteractions = useCallback(() => {
    cancelAutoLayoutPaddingEdit()
    drag.current = null
    applyCursor(null)
    pointerInside.current = false
    editor.setSnapGuides([])
    editor.setLayoutInsertIndicator(null)
    editor.setDropTarget(null)
    editor.setGuidePreview(null)
    editor.setGuideRedline(null)
    editor.setHoveredGuide(null)
    resetMeasurementModifiers()
  }, [applyCursor, editor])

  useLayoutEffect(() => {
    const { recordClick, getClickCount } = createClickCounter()
    const { getCoords, canvasToLocal, hitTestInScope, hitFns } = createCanvasPointer(
      canvasRef,
      editor,
      (cx, cy) => hitsRef.current.hitTestSectionTitle(cx, cy),
      (cx, cy) => hitsRef.current.hitTestComponentLabel(cx, cy),
      (cx, cy) => hitsRef.current.hitTestFrameTitle(cx, cy)
    )

    function canMeasure() {
      return (
        pointerInside.current &&
        !drag.current &&
        editor.state.activeTool === 'SELECT' &&
        editor.state.selectedIds.size > 0 &&
        !editor.state.editingTextId &&
        !editor.state.nodeEditState &&
        !editor.state.penState
      )
    }

    function refreshMeasurement() {
      const mode =
        altHeld.current && canMeasure()
          ? metaHeld.current || controlHeld.current
            ? 'deep'
            : 'shallow'
          : 'off'
      editor.setMeasurementMode(mode)
      const pointer = lastPointer.current
      if (!pointer || drag.current || editor.state.activeTool !== 'SELECT' || !pointerInside.current)
        return
      applyCursor(updateHoverCursor(pointer.cx, pointer.cy, editor, hitFns, mode === 'deep'))
      editor.setAutoLayoutHover(
        mode === 'off' ? resolveAutoLayoutHover(pointer.cx, pointer.cy, editor) : null
      )
    }

    function updateModifier(code: string, held: boolean) {
      if (!isEnabledRef.current()) return
      if (code === 'AltLeft' || code === 'AltRight') altHeld.current = held
      if (code === 'MetaLeft' || code === 'MetaRight') metaHeld.current = held
      if (code === 'ControlLeft' || code === 'ControlRight') controlHeld.current = held
      if (code.startsWith('Alt') || code.startsWith('Meta') || code.startsWith('Control')) {
        refreshMeasurement()
      }
    }

    function setDrag(next: DragState) {
      editor.setMeasurementMode('off')
      drag.current = next
    }

    const guideInput = createGuideInput({
      canvasRef,
      editor,
      canvasToLocal,
      setDrag,
      setCursor: applyCursor
    })

    function clearTransientInteractionFeedback() {
      editor.setSnapGuides([])
      editor.setLayoutInsertIndicator(null)
      editor.setDropTarget(null)
      guideInput.clearHoverAndPreview()
    }

    const { handleTextEditClick, onDblClick: onTextDblClick } = createTextEditInput({
      editor,
      getCoords,
      hitTestInScope,
      hitTestSectionTitle: (cx, cy) => hitsRef.current.hitTestSectionTitle(cx, cy),
      hitTestComponentLabel: (cx, cy) => hitsRef.current.hitTestComponentLabel(cx, cy),
      getClickCount,
      wasSelectedBeforeClickSequence: (id) => selectedIdsBeforeClickSequence.current.has(id),
      setDrag
    })

    const {
      tryStartRotation,
      handlePanMove,
      handleRotateMove,
      handleTextSelectMove,
      handleMarqueeMove
    } = createCanvasTransformInput(editor, canvasToLocal, setDrag)

    function startAutoLayoutPaddingEdit(event: MouseEvent): boolean {
      const { cx, cy } = getCoords(event)
      const hover = resolveAutoLayoutHover(cx, cy, editor)
      if (hover?.kind !== 'padding' && hover?.kind !== 'padding-value') return false
      if (!hover.side) return false
      const node = editor.graph.getNode(hover.nodeId)
      if (!node) return false
      const value = paddingValue(node, hover.side)
      autoLayoutPaddingEdit.current = {
        nodeId: node.id,
        side: hover.side,
        value,
        previous: value
      }
      event.preventDefault()
      event.stopPropagation()
      return true
    }

    function onDblClick(event: MouseEvent) {
      if (startAutoLayoutPaddingEdit(event)) return
      onTextDblClick(event)
    }

    function onMouseDown(event: MouseEvent) {
      onActivateRef.current?.()
      if (!isEnabledRef.current()) return
      editor.setMeasurementMode('off')
      const paddingEdit = autoLayoutPaddingEdit.current
      if (paddingEdit) commitAutoLayoutPaddingEdit(paddingEdit.value)
      if (!editor.state.editingTextId) canvasRef.current?.focus()
      editor.setHoveredNode(null)
      const { sx, sy, cx, cy } = getCoords(event)
      if (event.button === 0 && guideInput.tryStartExisting(sx, sy, event.altKey)) {
        event.preventDefault()
        return
      }
      if (event.button === 0 && guideInput.tryStartFromRuler(sx, sy, cx, cy)) {
        event.preventDefault()
        return
      }
      editor.setSelectedGuide(null)

      const selectedIdsBeforeMouseDown = new Set(editor.state.selectedIds)
      const clickCount = recordClick(sx, sy)
      if (clickCount === 1) selectedIdsBeforeClickSequence.current = selectedIdsBeforeMouseDown
      handleToolMouseDown({
        event,
        cx,
        cy,
        sx,
        sy,
        editor,
        hitFns,
        cursorOverride: cursorOverrideProxy,
        setDrag,
        tryStartRotation,
        handleTextEditClick
      })
    }

    function onMouseMove(event: MouseEvent) {
      if (!isEnabledRef.current()) return
      pointerInside.current = true
      const coords = getCoords(event)
      lastPointer.current = { cx: coords.cx, cy: coords.cy }
      onCursorMoveRef.current?.(coords.cx, coords.cy)

      if (!drag.current) {
        const { cx, cy } = coords
        updatePenHover(cx, cy, editor)
      }

      if (!drag.current) {
        const { cx, cy } = coords
        updateNodeEditHover(editor, cx, cy)
      }

      if (!drag.current && editor.state.activeTool === 'SELECT') {
        const { sx, sy, cx, cy } = coords
        const guideCursor = guideInput.updateHover(sx, sy)
        applyCursor(
          guideCursor ??
            updateHoverCursor(cx, cy, editor, hitFns, editor.state.measurementMode === 'deep')
        )
        editor.setAutoLayoutHover(
          editor.state.measurementMode === 'off' ? resolveAutoLayoutHover(cx, cy, editor) : null
        )
      }

      if (!drag.current) return
      const d = drag.current

      if (d.type === 'pan') {
        handlePanMove(d, event)
        return
      }

      const { sx, sy, cx, cy } = getCoords(event)

      if (d.type === 'guide') {
        const frameId = event.altKey && !d.guideId ? selectedTopLevelGuideFrameId(editor) : null
        guideInput.handleMove(
          d,
          sx,
          sy,
          cx,
          cy,
          frameId ? { frameId, deep: event.metaKey || event.ctrlKey } : undefined
        )
        return
      }

      if (d.type === 'rotate') {
        handleRotateMove(d, cx, cy, event.shiftKey)
        return
      }
      if (d.type === 'move') {
        handleMoveMove(d, cx, cy, sx, sy, editor, event.ctrlKey)
        return
      }
      if (d.type === 'text-select') {
        handleTextSelectMove(cx, cy)
        return
      }
      if (d.type === 'resize') {
        applyResize(d, cx, cy, event.shiftKey, editor, event.ctrlKey)
        return
      }
      if (d.type === 'pen-drag') {
        handlePenDragMove(d, cx, cy, spaceHeld.current, event, editor)
        return
      }
      if (d.type === 'edit-node' || d.type === 'edit-handle') {
        handleNodeEditMove(
          d,
          cx,
          cy,
          editor,
          event.altKey,
          event.metaKey || event.ctrlKey,
          event.shiftKey,
          event.ctrlKey
        )
        return
      }
      if (d.type === 'bend-handle') {
        handleBendHandleMove(d, cx, cy, event, editor)
        return
      }
      if (d.type === 'draw') {
        handleDrawMove(d, cx, cy, event.shiftKey, editor)
        return
      }

      handleMarqueeMove(d, cx, cy)
    }

    function onMouseUp() {
      if (!drag.current) return
      const d = drag.current

      if (handleNodeEditPointerUp(drag, editor)) return

      if (d.type === 'guide') {
        guideInput.finish(d)
      } else if (d.type === 'move') handleMoveUp(d, editor)
      else if (d.type === 'text-select') {
        drag.current = null
        return
      } else if (d.type === 'resize') commitResizePreview(d, editor)
      else if (d.type === 'pen-drag') {
        const penState = editor.state.penState as
          | (typeof editor.state.penState & {
              pendingClose?: boolean
            })
          | null
        if (penState?.pendingClose) {
          editor.penCommit(true)
        }
        drag.current = null
        return
      } else if (d.type === 'rotate') {
        const preview = editor.state.rotationPreview
        if (preview) {
          editor.updateNode(d.nodeId, { rotation: preview.angle })
          editor.commitRotation(d.nodeId, d.origRotation)
        }
        editor.setRotationPreview(null)
      } else if (d.type === 'draw') handleDrawUp(d, editor)
      else if (d.type === 'marquee') editor.setMarquee(null)

      drag.current = null
      applyCursor(null)
      refreshMeasurement()
    }

    function cancelPointerInteraction() {
      if (
        drag.current?.type === 'edit-node' ||
        drag.current?.type === 'edit-handle' ||
        drag.current?.type === 'bend-handle'
      ) {
        const methods = editor as Editor & {
          nodeEditCancelDrag?: () => void
        }
        methods.nodeEditCancelDrag?.()
      }
      drag.current = null
      applyCursor(null)
      clearTransientInteractionFeedback()
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      canvasRef.current?.setPointerCapture(event.pointerId)
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      onMouseUp()
      const canvas = canvasRef.current
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    }

    function onPointerCancel(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      cancelPointerInteraction()
      const canvas = canvasRef.current
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!guideInput.deleteSelected(event)) updateModifier(event.code, true)
    }

    function onKeyUp(event: KeyboardEvent) {
      updateModifier(event.code, false)
    }

    function onBlur() {
      resetMeasurementModifiers()
      cancelPointerInteraction()
    }

    function onMouseLeave() {
      pointerInside.current = false
      if (!isEnabledRef.current()) return
      editor.setMeasurementMode('off')
      if (!drag.current) {
        editor.setHoveredNode(null)
        editor.setHoveredGuide(null)
      }
    }

    function onWindowMouseUp() {
      if (drag.current) onMouseUp()
    }

    const stopToolListener = editor.onEditorEvent('tool:changed', () => {
      if (!isEnabledRef.current()) return
      editor.setMeasurementMode('off')
      cancelPointerInteraction()
    })

    return joinCleanups(
      onRefTarget(canvasRef, 'pointerdown', onPointerDown as EventListener),
      onRefTarget(canvasRef, 'pointerup', onPointerUp as EventListener),
      onRefTarget(canvasRef, 'pointercancel', onPointerCancel as EventListener),
      onRefTarget(canvasRef, 'dblclick', onDblClick as EventListener),
      onRefTarget(canvasRef, 'mousedown', onMouseDown as EventListener),
      onRefTarget(canvasRef, 'mousemove', onMouseMove as EventListener),
      onRefTarget(canvasRef, 'mouseup', onMouseUp as EventListener),
      onRefTarget(canvasRef, 'mouseleave', onMouseLeave as EventListener),
      onTarget(window, 'keydown', onKeyDown as EventListener),
      onTarget(window, 'keyup', onKeyUp as EventListener),
      onTarget(window, 'blur', onBlur as EventListener),
      onTarget(window, 'mouseup', onWindowMouseUp as EventListener, { capture: true }),
      setupSpaceHeld(spaceHeld),
      setupPanZoom(canvasRef, editor, drag, onMouseDown, onMouseMove, onMouseUp),
      stopToolListener
    )
  }, [applyCursor, canvasRef, editor])

  return {
    drag,
    cursorOverride,
    autoLayoutPaddingEdit,
    updateAutoLayoutPaddingEdit,
    commitAutoLayoutPaddingEdit,
    cancelAutoLayoutPaddingEdit,
    cleanupInteractions
  }
}
