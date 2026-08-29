import type { Editor } from '@open-pencil/core/editor'

export type LayerDragInstruction = {
  type: 'reorder-above' | 'reorder-below' | 'make-child'
}

export function applyLayerDrag(
  editor: Editor,
  sourceId: string,
  targetId: string,
  instruction: LayerDragInstruction
): boolean {
  if (!sourceId || !targetId || sourceId === targetId) return false
  if (editor.graph.isDescendant(targetId, sourceId)) return false

  const targetNode = editor.graph.getNode(targetId)
  if (!targetNode) return false
  const targetParentId = targetNode.parentId ?? editor.state.currentPageId
  const targetParent = editor.graph.getNode(targetParentId)
  if (!targetParent) return false
  const targetIndex = targetParent.childIds.indexOf(targetId)
  if (targetIndex < 0) return false

  if (instruction.type === 'reorder-above') {
    editor.reorderChildWithUndo(sourceId, targetParentId, targetIndex)
    return true
  }
  if (instruction.type === 'reorder-below') {
    editor.reorderChildWithUndo(sourceId, targetParentId, targetIndex + 1)
    return true
  }

  const container = editor.graph.getNode(targetId)
  if (!container || !editor.graph.isContainer(targetId)) return false
  editor.reorderChildWithUndo(sourceId, targetId, container.childIds.length)
  return true
}
