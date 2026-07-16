import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'

import type { SceneNode } from '@open-pencil/core'

/**
 * Returns selection-derived state for the current editor.
 */
export function useSelectionState() {
  const editor = useEditor()

  const selectedIds = useSceneComputed(() => editor.state.selectedIds)
  const hasSelection = selectedIds.size > 0
  const selectedNode = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const selectedCount = selectedIds.size
  const selectedNodeType = selectedNode?.type ?? null
  const isInstance = selectedNodeType === 'INSTANCE'
  const isComponent = selectedNodeType === 'COMPONENT'
  const isGroup = selectedNodeType === 'GROUP'

  const canCreateComponentSet = useSceneComputed(() => {
    if (selectedIds.size < 2) return false
    for (const id of selectedIds) {
      if (editor.graph.getNode(id)?.type !== 'COMPONENT') return false
    }
    return true
  })

  return {
    editor,
    selectedIds,
    hasSelection,
    selectedNode,
    selectedCount,
    selectedNodeType,
    isInstance,
    isComponent,
    isGroup,
    canCreateComponentSet
  }
}
