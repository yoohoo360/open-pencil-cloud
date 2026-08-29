import type { SceneNode } from '@open-pencil/scene-graph'
import type { Editor } from '@open-pencil/core/editor'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Returns selection-derived state for the current editor.
 */
export type SelectionState = {
  editor: Editor
  selectedIds: Set<string>
  hasSelection: boolean
  selectedNode: SceneNode | null
  selectedCount: number
  selectedNodeType: SceneNode['type'] | null
  isInstance: boolean
  isComponent: boolean
  isGroup: boolean
  canCreateComponentSet: boolean
}

export function useSelectionState(): SelectionState {
  const editor = useEditor()
  const selectedIds = useSceneComputed(() => editor.state.selectedIds)
  const selectedNode = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const selectedCount = selectedIds.size
  const hasSelection = selectedCount > 0
  const selectedNodeType = selectedNode?.type ?? null

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
    isInstance: selectedNodeType === 'INSTANCE',
    isComponent: selectedNodeType === 'COMPONENT',
    isGroup: selectedNodeType === 'GROUP',
    canCreateComponentSet
  }
}
