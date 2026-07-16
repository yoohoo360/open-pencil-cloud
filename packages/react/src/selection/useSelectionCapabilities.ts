import { useSceneComputed } from '../internal/useSceneComputed'
import { useSelectionState } from './useSelectionState'

/**
 * Returns booleans describing which selection-dependent actions are
 * currently available.
 *
 * This is useful for menus, toolbars, shortcuts, and action buttons that need
 * command-friendly capability checks.
 */
export function useSelectionCapabilities() {
  const {
    editor,
    selectedIds,
    selectedNode,
    selectedCount,
    hasSelection,
    isInstance,
    isGroup,
    canCreateComponentSet
  } = useSelectionState()

  const canMoveToPage = useSceneComputed(() => hasSelection && editor.graph.getPages().length > 1)
  const canSelectAll = useSceneComputed(
    () => editor.graph.getChildren(editor.state.currentPageId).length > 0
  )
  const canUndo = useSceneComputed(() => editor.undo.canUndo)
  const canRedo = useSceneComputed(() => editor.undo.canRedo)

  return {
    selectedIds,
    selectedNode,
    canCopy: hasSelection,
    canCut: hasSelection,
    canPaste: true,
    canDelete: hasSelection,
    canDuplicate: hasSelection,
    canExportSelection: hasSelection,
    canGroup: selectedCount >= 2,
    canUngroup: isGroup,
    canCreateComponent: hasSelection,
    canCreateComponentSet,
    canDetachInstance: isInstance,
    canWrapInAutoLayout: hasSelection,
    canBringToFront: hasSelection,
    canSendToBack: hasSelection,
    canToggleVisibility: hasSelection,
    canToggleLock: hasSelection,
    canGoToMainComponent: isInstance,
    canCreateInstance: selectedNode?.type === 'COMPONENT',
    canMoveToPage,
    canSelectAll,
    canUndo,
    canRedo,
    canZoomToSelection: hasSelection
  }
}
