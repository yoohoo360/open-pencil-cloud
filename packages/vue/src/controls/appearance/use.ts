import { ref } from 'vue'

import { createAppearanceActions, createAppearanceState } from '#vue/controls/appearance/helpers'
import { useNodeProps } from '#vue/controls/node-props/use'
import { useEditor } from '#vue/editor/context'

/**
 * Returns appearance-related state and actions for the current selection.
 *
 * Use this composable for visibility, opacity, and corner-radius controls in
 * property panels.
 */
export function useAppearance() {
  const editor = useEditor()
  const { nodes, node, active, isMulti, merged, updateProp, commitProp } = useNodeProps()

  const expandedCornerNodeId = ref<string | null>(null)
  const options = { node, nodes, isMulti, merged, expandedCornerNodeId }
  const appearanceState = createAppearanceState(options)
  const appearanceActions = createAppearanceActions({ editor, ...options })

  return {
    editor,
    nodes,
    node,
    active,
    isMulti,
    ...appearanceState,
    updateProp,
    commitProp,
    ...appearanceActions
  }
}
