import type { SceneNode } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Returns reactive selection-derived state for the current editor.
 *
 * Use this composable to drive UI from the current selection without manually
 * reading graph state in every component.
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
