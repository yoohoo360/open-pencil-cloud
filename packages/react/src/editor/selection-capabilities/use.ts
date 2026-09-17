import { canMakeBooleanSourceNode, hasVisibleStrokeSourceNode } from '@open-pencil/core/canvas'

import { hasDocumentCapability, useDocumentAccess } from '#react/app/document/access'
import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Selection-dependent action availability for menus, toolbars, and shortcuts.
 * Document ACL (view/edit/copy) further restricts mutating and copy actions.
 */
export function useSelectionCapabilities() {
  const editor = useEditor()
  const selection = useSelectionState()
  const access = useDocumentAccess()
  const canEditDoc = hasDocumentCapability(access, 'edit')
  const canCopyDoc = hasDocumentCapability(access, 'copy')
  const canDuplicateDoc = hasDocumentCapability(access, 'duplicate')
  const canExportDoc = hasDocumentCapability(access, 'export')
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
    canCopy: hasSelection && canCopyDoc,
    canCut: hasSelection && canEditDoc && canCopyDoc,
    canPaste: canEditDoc,
    canDelete: hasSelection && canEditDoc,
    canDuplicate: hasSelection && canDuplicateDoc && canEditDoc,
    canGroup: selectedCount >= 2 && canEditDoc,
    canFrameSelection: hasSelection && canEditDoc,
    canUngroup: selection.isGroup && canEditDoc,
    canCreateComponent: hasSelection && !selection.isComponent && canEditDoc,
    canCreateComponentSet: selection.canCreateComponentSet && canEditDoc,
    canDetachInstance: selection.isInstance && canEditDoc,
    canWrapInAutoLayout: hasSelection && canEditDoc,
    canToggleMask: hasSelection && canEditDoc,
    canBringToFront: hasSelection && canEditDoc,
    canSendToBack: hasSelection && canEditDoc,
    canToggleVisibility: hasSelection && canEditDoc,
    canToggleLock: hasSelection && canEditDoc,
    canFlip: hasSelection && canEditDoc,
    canDistribute: canDistribute && canEditDoc,
    canBooleanOperation: selectedCount >= 2 && selectedNodesCanFlatten && canEditDoc,
    canFlatten: selectedNodesCanFlatten && canEditDoc,
    canOutlineText: canOutlineText && canEditDoc,
    canOutlineStroke: canOutlineStroke && canEditDoc,
    canGoToMainComponent: selection.isInstance,
    canCreateInstance: selectedNode?.type === 'COMPONENT' && canEditDoc,
    canMoveToPage: canMoveToPage && canEditDoc,
    canSelectAll,
    canUndo: canUndo && canEditDoc,
    canRedo: canRedo && canEditDoc,
    canZoomToSelection: hasSelection,
    canSetOpacity: hasSelection && canEditDoc,
    canExport: canExportDoc
  }
}
