import type { MutableRef } from '#react/shared/input/ref'

import type { Editor } from '@open-pencil/core/editor'

import {
  getCanvasNodeEditState,
  handleBendHandleMove,
  resolveBendTargetHandle,
  type CanvasNodeEditMethods
} from '#react/canvas/vector-input/bend'
import type { DragState } from '#react/shared/input/types'
import { hitTestEditHandle, isEndpoint, NODE_HIT_THRESHOLD } from '#react/shared/input/vector'

export function updateNodeEditHover(editor: Editor, cx: number, cy: number): boolean {
  const state = getCanvasNodeEditState(editor)
  if (!state) return false
  const hit = hitTestEditHandle(editor, cx, cy)
  const previous = state.hoveredHandleInfo
  if (hit) {
    if (
      !previous ||
      previous.segmentIndex !== hit.segmentIndex ||
      previous.tangentField !== hit.tangentField
    ) {
      state.hoveredHandleInfo = { segmentIndex: hit.segmentIndex, tangentField: hit.tangentField }
      editor.requestRepaint()
    }
  } else if (previous) {
    state.hoveredHandleInfo = null
    editor.requestRepaint()
  }
  return true
}

export { handleBendHandleMove, resolveBendTargetHandle }

export function handleNodeEditPointerUp(drag: MutableRef<DragState | null>, editor: Editor): boolean {
  const methods = editor as Editor & CanvasNodeEditMethods
  const current = drag.current
  if (!current) return false
  if (current.type === 'bend-handle') {
    editor.setSnapGuides([])
    if (current.lockedMode === null) methods.nodeEditZeroVertexHandles?.(current.vertexIndex)
    methods.commitNodeEditChanges?.()
    drag.current = null
    return true
  }
  if (current.type === 'edit-node') {
    editor.setSnapGuides([])
    const state = getCanvasNodeEditState(editor)
    if (state && current.origPositions.size === 1) {
      const [draggedIndex] = current.origPositions.keys()
      if (isEndpoint(draggedIndex, state.segments)) {
        const vertex = state.vertices[draggedIndex]
        const threshold = NODE_HIT_THRESHOLD / editor.state.zoom
        for (let index = 0; index < state.vertices.length; index++) {
          if (index === draggedIndex || !isEndpoint(index, state.segments)) continue
          const target = state.vertices[index]
          if (Math.hypot(vertex.x - target.x, vertex.y - target.y) < threshold) {
            methods.nodeEditConnectEndpoints?.(draggedIndex, index)
            break
          }
        }
      }
    }
    methods.commitNodeEditChanges?.()
    drag.current = null
    return true
  }
  if (current.type === 'edit-handle') {
    editor.setSnapGuides([])
    methods.commitNodeEditChanges?.()
    drag.current = null
    return true
  }
  return false
}
