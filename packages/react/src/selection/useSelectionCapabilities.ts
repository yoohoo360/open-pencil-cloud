import { useSceneComputed } from '../internal/useSceneComputed'
import { useSelectionState } from './useSelectionState'

/**
 * Returns reactive booleans describing which selection-dependent actions are
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

  const canCopy = hasSelection
  const canCut = hasSelection
  const canDelete = hasSelection
  const canDuplicate = hasSelection
  const canExportSelection = hasSelection
  const canGroup = selectedCount >= 2
  const canUngroup = isGroup
  const canCreateComponent = hasSelection
  const canDetachInstance = isInstance
  const canWrapInAutoLayout = hasSelection
  const canBringToFront = hasSelection
  const canSendToBack = hasSelection
  const canToggleVisibility = hasSelection
  const canToggleLock = hasSelection
  const canGoToMainComponent = isInstance
  const canCreateInstance = selectedNode?.type === 'COMPONENT'
  const canMoveToPage = useSceneComputed(
    () => hasSelection && editor.graph.getPages().length > 1
  )
  const canPaste = true
  const canSelectAll = useSceneComputed(
    () => editor.graph.getChildren(editor.state.currentPageId).length > 0
  )
  const canUndo = editor.undo.canUndo
  const canRedo = editor.undo.canRedo
  const canZoomToSelection = hasSelection

  return {
    selectedIds,
    selectedNode,
    canCopy,
    canCut,
    canPaste,
    canDelete,
    canDuplicate,
    canExportSelection,
    canGroup,
    canUngroup,
    canCreateComponent,
    canCreateComponentSet,
    canDetachInstance,
    canWrapInAutoLayout,
    canBringToFront,
    canSendToBack,
    canToggleVisibility,
    canToggleLock,
    canGoToMainComponent,
    canCreateInstance,
    canMoveToPage,
    canSelectAll,
    canUndo,
    canRedo,
    canZoomToSelection
  }
}
