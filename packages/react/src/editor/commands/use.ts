import type { EditorCommand, EditorCommandId, EditorCommandMenuItem } from '#react/editor/commands/types'
import { editorCommandMetadata } from '#react/editor/commands/registry'
import { formatShortcut } from '#react/editor/commands/shortcut'
import { useEditor } from '#react/editor/context'
import { useSelectionCapabilities } from '#react/editor/selection-capabilities/use'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'

type CommandRunner = () => void

function command(
  id: EditorCommandId,
  label: string,
  run: CommandRunner,
  enabled = true
): EditorCommand {
  return { id, label, enabled, run }
}

export function useEditorCommands() {
  const editor = useEditor()
  const selection = useSelectionState()
  const capabilities = useSelectionCapabilities()
  const { commands: labels } = useI18n()
  const pages = useSceneComputed(() => editor.graph.getPages())
  const otherPages = pages.filter((page) => page.id !== editor.state.currentPageId)

  function moveSelectionToPage(pageId: string) {
    if (!capabilities.canMoveToPage) return
    editor.moveToPage(pageId)
  }

  const commands: Record<string, EditorCommand> = {
    'edit.undo': command('edit.undo', labels.undo, () => editor.undo.undo(), capabilities.canUndo),
    'edit.redo': command('edit.redo', labels.redo, () => editor.undo.redo(), capabilities.canRedo),
    'view.zoomFit': command('view.zoomFit', labels.zoomToFit, () => editor.zoomToFit()),
    'view.zoom100': command('view.zoom100', labels.zoomTo100, () => editor.zoomToLevel(1)),
    'view.zoomSelection': command(
      'view.zoomSelection',
      labels.zoomToSelection,
      () => editor.zoomToSelection(),
      capabilities.canZoomToSelection
    ),
    'selection.duplicate': command(
      'selection.duplicate',
      labels.duplicate,
      () => editor.duplicateSelected(),
      capabilities.canDuplicate
    ),
    'selection.delete': command(
      'selection.delete',
      labels.delete,
      () => editor.deleteSelected(),
      capabilities.canDelete
    ),
    'selection.group': command(
      'selection.group',
      labels.groupSelection,
      () => editor.groupSelected(),
      capabilities.canGroup
    ),
    'selection.frameSelection': command(
      'selection.frameSelection',
      labels.frameSelection,
      () => editor.frameSelection(),
      capabilities.canFrameSelection
    ),
    'selection.ungroup': command(
      'selection.ungroup',
      labels.ungroup,
      () => editor.ungroupSelected(),
      capabilities.canUngroup
    ),
    'selection.createComponent': command(
      'selection.createComponent',
      labels.createComponent,
      () => editor.createComponentFromSelection(),
      capabilities.canCreateComponent
    ),
    'selection.createComponentSet': command(
      'selection.createComponentSet',
      labels.createComponentSet,
      () => editor.createComponentSetFromComponents(),
      capabilities.canCreateComponentSet
    ),
    'selection.createInstance': command(
      'selection.createInstance',
      labels.createInstance,
      () => {
        const node = selection.selectedNode
        if (node?.type === 'COMPONENT') editor.createInstanceFromComponent(node.id)
      },
      capabilities.canCreateInstance
    ),
    'selection.detachInstance': command(
      'selection.detachInstance',
      labels.detachInstance,
      () => editor.detachInstance(),
      capabilities.canDetachInstance
    ),
    'selection.goToMainComponent': command(
      'selection.goToMainComponent',
      labels.goToMainComponent,
      () => void editor.goToMainComponent(),
      capabilities.canGoToMainComponent
    ),
    'selection.wrapInAutoLayout': command(
      'selection.wrapInAutoLayout',
      labels.addAutoLayout,
      () => editor.wrapInAutoLayout(),
      capabilities.canWrapInAutoLayout
    ),
    'selection.toggleMask': command(
      'selection.toggleMask',
      selection.selectedNode?.isMask ? labels.removeMask : labels.useAsMask,
      () => {
        const node = selection.selectedNode
        if (!node) return
        editor.updateNodeWithUndo(
          node.id,
          { isMask: !node.isMask },
          node.isMask ? 'Remove mask' : 'Use as mask'
        )
      },
      capabilities.canToggleMask
    ),
    'selection.bringForward': command(
      'selection.bringForward',
      labels.bringForward,
      () => editor.bringForward(),
      capabilities.canBringToFront
    ),
    'selection.bringToFront': command(
      'selection.bringToFront',
      labels.bringToFront,
      () => editor.bringToFront(),
      capabilities.canBringToFront
    ),
    'selection.sendBackward': command(
      'selection.sendBackward',
      labels.sendBackward,
      () => editor.sendBackward(),
      capabilities.canSendToBack
    ),
    'selection.sendToBack': command(
      'selection.sendToBack',
      labels.sendToBack,
      () => editor.sendToBack(),
      capabilities.canSendToBack
    ),
    'selection.toggleVisibility': command(
      'selection.toggleVisibility',
      labels.showHide,
      () => editor.toggleVisibility(),
      capabilities.canToggleVisibility
    ),
    'selection.toggleLock': command(
      'selection.toggleLock',
      labels.lockUnlock,
      () => editor.toggleLock(),
      capabilities.canToggleLock
    ),
    'selection.flipHorizontal': command(
      'selection.flipHorizontal',
      labels.flipHorizontal,
      () => editor.flipNodes([...selection.selectedIds], 'horizontal'),
      capabilities.canFlip
    ),
    'selection.flipVertical': command(
      'selection.flipVertical',
      labels.flipVertical,
      () => editor.flipNodes([...selection.selectedIds], 'vertical'),
      capabilities.canFlip
    ),
    'selection.distributeHorizontal': command(
      'selection.distributeHorizontal',
      labels.distributeHorizontal,
      () => editor.distributeNodes([...selection.selectedIds], 'horizontal'),
      capabilities.canDistribute
    ),
    'selection.distributeVertical': command(
      'selection.distributeVertical',
      labels.distributeVertical,
      () => editor.distributeNodes([...selection.selectedIds], 'vertical'),
      capabilities.canDistribute
    ),
    'selection.booleanUnion': command(
      'selection.booleanUnion',
      labels.unionSelection,
      () => editor.booleanOperationSelected('UNION'),
      capabilities.canBooleanOperation
    ),
    'selection.booleanSubtract': command(
      'selection.booleanSubtract',
      labels.subtractSelection,
      () => editor.booleanOperationSelected('SUBTRACT'),
      capabilities.canBooleanOperation
    ),
    'selection.booleanIntersect': command(
      'selection.booleanIntersect',
      labels.intersectSelection,
      () => editor.booleanOperationSelected('INTERSECT'),
      capabilities.canBooleanOperation
    ),
    'selection.booleanExclude': command(
      'selection.booleanExclude',
      labels.excludeSelection,
      () => editor.booleanOperationSelected('EXCLUDE'),
      capabilities.canBooleanOperation
    ),
    'selection.flatten': command(
      'selection.flatten',
      labels.flattenSelection,
      () => editor.flattenSelected(),
      capabilities.canFlatten
    ),
    'selection.outlineText': command(
      'selection.outlineText',
      labels.outlineText,
      () => editor.outlineTextSelected(),
      capabilities.canOutlineText
    ),
    'selection.outlineStroke': command(
      'selection.outlineStroke',
      labels.outlineStroke,
      () => editor.outlineStrokeSelected(),
      capabilities.canOutlineStroke
    ),
    'selection.moveToPage': command(
      'selection.moveToPage',
      labels.moveToPage,
      () => {
        const page = otherPages[0]
        if (page) moveSelectionToPage(page.id)
      },
      capabilities.canMoveToPage
    )
  }

  function getCommand(id: EditorCommandId): EditorCommand {
    return (
      commands[id] ??
      command(id, id, () => {
        /* no-op until the command is ported */
      })
    )
  }

  function runCommand(id: EditorCommandId) {
    const next = getCommand(id)
    if (next.enabled) next.run()
  }

  function menuItem(
    id: EditorCommandId,
    shortcut = editorCommandMetadata(id).shortcut
  ): EditorCommandMenuItem {
    const next = getCommand(id)
    return {
      id,
      label: next.label,
      shortcut: formatShortcut(shortcut),
      disabled: !next.enabled,
      testId: editorCommandMetadata(id).contextTestId,
      action: () => runCommand(id)
    }
  }

  return { commands, getCommand, runCommand, menuItem, otherPages, moveSelectionToPage }
}
