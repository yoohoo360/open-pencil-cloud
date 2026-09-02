import { createAppearanceActions, createAppearanceState } from '#react/controls/appearance/helpers'
import { useNodeProps } from '#react/controls/node-props/use'
import { useEditor } from '#react/editor/context'

/**
 * Returns appearance-related state and actions for the current selection.
 *
 * Use this composable for visibility, opacity, and corner-radius controls in
 * property panels.
 */
export function useAppearance() {
  const editor = useEditor()
  const { nodes, node, active, isMulti, merged, updateProp, commitProp } = useNodeProps()

  const appearanceState = createAppearanceState({ node, nodes, isMulti, merged })
  const appearanceActions = createAppearanceActions({ editor, node, nodes, isMulti, merged })

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
