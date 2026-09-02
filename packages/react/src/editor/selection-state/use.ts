import { computed } from '#react/internal/reactive'
import type { SceneNode } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputedRef } from '#react/internal/scene-computed/use'

/**
 * Returns reactive selection-derived state for the current editor.
 *
 * Use this composable to drive UI from the current selection without manually
 * reading graph state in every component.
 */
export function useSelectionState() {
  const editor = useEditor()

  const selectedIds = useSceneComputedRef(() => editor.state.selectedIds)

  const hasSelection = computed(() => selectedIds.value.size > 0)

  const selectedNode = useSceneComputedRef<SceneNode | null>(() => editor.getSelectedNode() ?? null)

  const selectedCount = computed(() => selectedIds.value.size)

  const selectedNodeType = computed(() => selectedNode.value?.type ?? null)

  const isInstance = computed(() => selectedNodeType.value === 'INSTANCE')
  const isComponent = computed(() => selectedNodeType.value === 'COMPONENT')
  const isGroup = computed(() => selectedNodeType.value === 'GROUP')

  const canCreateComponentSet = useSceneComputedRef(() => {
    if (selectedIds.value.size < 2) return false
    for (const id of selectedIds.value) {
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
