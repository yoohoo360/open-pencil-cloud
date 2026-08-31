import {
  enclosingBuiltinInstance,
  isBuiltinInstance,
  isBuiltinTextLayer
} from '#react/graph/builtin'
import type { DragState } from '#react/shared/input/types'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneNode } from '@open-pencil/scene-graph'

type NodeEditMethods = Partial<{ enterNodeEditMode: (nodeId: string) => void }>
type GetCoords = (e: MouseEvent) => { cx: number; cy: number }
type HitTest = (cx: number, cy: number, deep: boolean) => SceneNode | null
type SetDrag = (drag: DragState) => void

const TEXT_EDIT_POINTER_GRACE_MS = 400
let textEditStartedAt = 0

export function markTextEditStarted() {
  textEditStartedAt = performance.now()
}

function recentlyStartedTextEdit() {
  return performance.now() - textEditStartedAt < TEXT_EDIT_POINTER_GRACE_MS
}

function textEditHitSize(node: SceneNode) {
  return {
    width: Math.max(node.width, 1),
    height: Math.max(node.height, node.fontSize || 1)
  }
}

type TextEditInputOptions = {
  editor: Editor
  getCoords: GetCoords
  hitTestInScope: HitTest
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null
  getClickCount: () => number
  wasSelectedBeforeClickSequence: (id: string) => boolean
  setDrag: SetDrag
}

export function createTextEditInput(options: TextEditInputOptions) {
  const {
    editor,
    getCoords,
    hitTestInScope,
    hitTestSectionTitle,
    hitTestComponentLabel,
    getClickCount,
    wasSelectedBeforeClickSequence,
    setDrag
  } = options

  function handleTextEditClick(cx: number, cy: number, shiftKey: boolean): boolean {
    const textEd = editor.textEditor
    const editNode = editor.state.editingTextId
      ? editor.graph.getNode(editor.state.editingTextId)
      : null
    if (!textEd || !editNode) {
      editor.commitTextEdit()
      return false
    }
    const abs = editor.graph.getAbsolutePosition(editNode.id)
    const localX = cx - abs.x
    const localY = cy - abs.y
    const hitSize = textEditHitSize(editNode)
    if (localX < 0 || localY < 0 || localX > hitSize.width || localY > hitSize.height) {
      if (recentlyStartedTextEdit()) return true
      editor.commitTextEdit()
      const next = hitTestInScope(cx, cy, true)
      if (next?.type === 'TEXT' && next.id !== editNode.id) {
        startTextEditingAt(next, cx, cy)
        return true
      }
      return false
    }
    if (getClickCount() >= 3) {
      textEd.selectAll()
    } else if (getClickCount() === 2) {
      textEd.selectWordAt(localX, localY)
    } else {
      textEd.setCursorAt(localX, localY, shiftKey)
      setDrag({ type: 'text-select', startX: cx, startY: cy })
    }
    editor.requestRender()
    return true
  }

  function startTextEditingAt(hit: SceneNode, cx: number, cy: number) {
    if (isBuiltinTextLayer(editor.graph, hit)) {
      const host = enclosingBuiltinInstance(editor.graph, hit.id)
      if (host) editor.select([host.id])
      return
    }
    editor.select([hit.id])
    editor.startTextEditing(hit.id)
    markTextEditStarted()
    const textEd = editor.textEditor
    if (textEd) {
      const abs = editor.graph.getAbsolutePosition(hit.id)
      textEd.selectWordAt(cx - abs.x, cy - abs.y)
      editor.requestRender()
    }
  }

  function getContainerDescendantHit(
    containerId: string,
    cx: number,
    cy: number
  ): SceneNode | null {
    const hit = editor.graph.hitTestDeep(cx, cy, editor.state.currentPageId)
    if (!hit) return null
    if (hit.id === containerId || editor.graph.isDescendant(hit.id, containerId)) return hit
    return null
  }

  function selectBuiltinHost(hit: SceneNode): boolean {
    const host = enclosingBuiltinInstance(editor.graph, hit.id)
    if (!host) return false
    editor.select([host.id])
    return true
  }

  function enterSelectedContainer(selectedId: string, cx: number, cy: number) {
    const hit = getContainerDescendantHit(selectedId, cx, cy)
    editor.enterContainer(selectedId)
    if (hit?.type === 'TEXT') startTextEditingAt(hit, cx, cy)
    else if (hit) editor.select([hit.id])
    else editor.clearSelection()
  }

  function onDblClick(e: MouseEvent) {
    const nodeEditEditor = editor as Editor & NodeEditMethods
    if (editor.state.editingTextId) return

    const { cx, cy } = getCoords(e)

    const selectedId =
      editor.state.selectedIds.size === 1 ? [...editor.state.selectedIds][0] : undefined
    const selectedNode = selectedId ? editor.graph.getNode(selectedId) : undefined
    const canEnter =
      selectedNode && selectedId && editor.graph.isContainer(selectedId) && !selectedNode.locked

    if (canEnter) {
      if (isBuiltinInstance(selectedNode, editor.graph)) return
      enterSelectedContainer(selectedId, cx, cy)
      return
    }

    const hit =
      hitTestSectionTitle(cx, cy) ?? hitTestComponentLabel(cx, cy) ?? hitTestInScope(cx, cy, true)
    if (!hit) return
    if (selectBuiltinHost(hit)) return

    if (hit.type === 'TEXT') {
      const isTopLevelText = hit.parentId === editor.state.currentPageId
      if (!isTopLevelText && selectedId !== hit.id && !wasSelectedBeforeClickSequence(hit.id)) {
        editor.select([hit.id])
        return
      }
      startTextEditingAt(hit, cx, cy)
      return
    }

    if (hit.type === 'VECTOR') {
      nodeEditEditor.enterNodeEditMode?.(hit.id)
      return
    }

    editor.select([hit.id])
  }

  return { handleTextEditClick, onDblClick }
}
