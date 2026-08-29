import { canMakeBooleanSourceNode, hasVisibleStrokeSourceNode } from '@open-pencil/core/canvas'

import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Selection-dependent action availability for menus, toolbars, and shortcuts.
 */
export function useSelectionCapabilities() {
  const editor = useEditor()
  const selection = useSelectionState()
  const { selectedNode, selectedCount, hasSelection } = selection

  const selectedNodesCanFlatten = useSceneComputed(() => {
    const nodes = editor.getSelectedNodes()
    return nodes.length > 0 && nodes.every((node) => canMakeBooleanSourceNode(node, editor.graph))
  })
  const canOutlineText = useSceneComputed(() => {
    const nodes = editor.getSelectedNodes()
    return (
      nodes.length > 0 &&
      nodes.every((node) => node.type === 'TEXT' && canMakeBooleanSourceNode(node, editor.graph))
    )
  })
  const canOutlineStroke = useSceneComputed(() => {
    const nodes = editor.getSelectedNodes()
    return (
      nodes.length > 0 &&
      nodes.every(
        (node) =>
          hasVisibleStrokeSourceNode(node, editor.graph) &&
          canMakeBooleanSourceNode(node, editor.graph)
      )
    )
  })
  const canMoveToPage = useSceneComputed(
    () => hasSelection && editor.graph.getPages().length > 1
  )
  const canDistribute = useSceneComputed(() =>
    editor.canDistributeNodes([...editor.state.selectedIds])
  )
  const canSelectAll = useSceneComputed(
    () => editor.graph.getChildren(editor.state.currentPageId).length > 0
  )
  const canUndo = useSceneComputed(
    () => editor.state.nodeEditState != null || editor.undo.canUndo
  )
  const canRedo = useSceneComputed(
    () => editor.state.nodeEditState != null || editor.undo.canRedo
  )

  return {
    canCopy: hasSelection,
    canCut: hasSelection,
    canPaste: true,
    canDelete: hasSelection,
    canDuplicate: hasSelection,
    canGroup: selectedCount >= 2,
    canFrameSelection: hasSelection,
    canUngroup: selection.isGroup,
    canCreateComponent: hasSelection && !selection.isComponent,
    canCreateComponentSet: selection.canCreateComponentSet,
    canDetachInstance: selection.isInstance,
    canWrapInAutoLayout: hasSelection,
    canToggleMask: hasSelection,
    canBringToFront: hasSelection,
    canSendToBack: hasSelection,
    canToggleVisibility: hasSelection,
    canToggleLock: hasSelection,
    canFlip: hasSelection,
    canDistribute,
    canBooleanOperation: selectedCount >= 2 && selectedNodesCanFlatten,
    canFlatten: selectedNodesCanFlatten,
    canOutlineText,
    canOutlineStroke,
    canGoToMainComponent: selection.isInstance,
    canCreateInstance: selectedNode?.type === 'COMPONENT',
    canMoveToPage,
    canSelectAll,
    canUndo,
    canRedo,
    canZoomToSelection: hasSelection
  }
}
