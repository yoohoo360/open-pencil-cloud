import type { EditorCommand, EditorCommandId, EditorCommandMenuItem } from '#react/editor/commands/types'
import { editorCommandMetadata } from '#react/editor/commands/registry'
import { formatShortcut } from '#react/editor/commands/shortcut'
import { useEditor } from '#react/editor/context'
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
  const { commands: labels } = useI18n()
  const hasSelection = selection.hasSelection
  const selectedCount = selection.selectedCount
  const pages = useSceneComputed(() => editor.graph.getPages())
  const otherPages = pages.filter((page) => page.id !== editor.state.currentPageId)

  function moveSelectionToPage(pageId: string) {
    if (!hasSelection) return
    editor.moveToPage(pageId)
  }

  const commands: Record<string, EditorCommand> = {
    'edit.undo': command('edit.undo', labels.undo, () => editor.undo.undo(), editor.undo.canUndo),
    'edit.redo': command('edit.redo', labels.redo, () => editor.undo.redo(), editor.undo.canRedo),
    'view.zoomFit': command('view.zoomFit', labels.zoomToFit, () => editor.zoomToFit()),
    'view.zoom100': command('view.zoom100', labels.zoomTo100, () => editor.zoomToLevel(1)),
    'view.zoomSelection': command(
      'view.zoomSelection',
      labels.zoomToSelection,
      () => editor.zoomToSelection(),
      hasSelection
    ),
    'selection.duplicate': command(
      'selection.duplicate',
      labels.duplicate,
      () => editor.duplicateSelected(),
      hasSelection
    ),
    'selection.delete': command(
      'selection.delete',
      labels.delete,
      () => editor.deleteSelected(),
      hasSelection
    ),
    'selection.group': command(
      'selection.group',
      labels.groupSelection,
      () => editor.groupSelected(),
      selectedCount >= 2
    ),
    'selection.frameSelection': command(
      'selection.frameSelection',
      labels.frameSelection,
      () => editor.frameSelection(),
      hasSelection
    ),
    'selection.ungroup': command(
      'selection.ungroup',
      labels.ungroup,
      () => editor.ungroupSelected(),
      selection.isGroup
    ),
    'selection.createComponent': command(
      'selection.createComponent',
      labels.createComponent,
      () => editor.createComponentFromSelection(),
      hasSelection && !selection.isComponent
    ),
    'selection.createComponentSet': command(
      'selection.createComponentSet',
      labels.createComponentSet,
      () => editor.createComponentSetFromComponents(),
      selection.canCreateComponentSet
    ),
    'selection.createInstance': command(
      'selection.createInstance',
      labels.createInstance,
      () => {
        const node = selection.selectedNode
        if (node?.type === 'COMPONENT') editor.createInstanceFromComponent(node.id)
      },
      selection.isComponent
    ),
    'selection.detachInstance': command(
      'selection.detachInstance',
      labels.detachInstance,
      () => editor.detachInstance(),
      selection.isInstance
    ),
    'selection.goToMainComponent': command(
      'selection.goToMainComponent',
      labels.goToMainComponent,
      () => void editor.goToMainComponent(),
      selection.isInstance
    ),
    'selection.wrapInAutoLayout': command(
      'selection.wrapInAutoLayout',
      labels.addAutoLayout,
      () => editor.wrapInAutoLayout(),
      hasSelection
    ),
    'selection.toggleMask': command(
      'selection.toggleMask',
      selection.selectedNode?.isMask ? labels.removeMask : labels.useAsMask,
      () => {
        const node = selection.selectedNode
        if (!node) return
        editor.updateNodeWithUndo(node.id, { isMask: !node.isMask }, node.isMask ? 'Remove mask' : 'Use as mask')
      },
      hasSelection
    ),
    'selection.bringForward': command(
      'selection.bringForward',
      labels.bringForward,
      () => editor.bringForward(),
      hasSelection
    ),
    'selection.bringToFront': command(
      'selection.bringToFront',
      labels.bringToFront,
      () => editor.bringToFront(),
      hasSelection
    ),
    'selection.sendBackward': command(
      'selection.sendBackward',
      labels.sendBackward,
      () => editor.sendBackward(),
      hasSelection
    ),
    'selection.sendToBack': command(
      'selection.sendToBack',
      labels.sendToBack,
      () => editor.sendToBack(),
      hasSelection
    ),
    'selection.toggleVisibility': command(
      'selection.toggleVisibility',
      labels.showHide,
      () => editor.toggleVisibility(),
      hasSelection
    ),
    'selection.toggleLock': command(
      'selection.toggleLock',
      labels.lockUnlock,
      () => editor.toggleLock(),
      hasSelection
    ),
    'selection.flipHorizontal': command(
      'selection.flipHorizontal',
      labels.flipHorizontal,
      () => editor.flipNodes([...selection.selectedIds], 'horizontal'),
      hasSelection
    ),
    'selection.flipVertical': command(
      'selection.flipVertical',
      labels.flipVertical,
      () => editor.flipNodes([...selection.selectedIds], 'vertical'),
      hasSelection
    ),
    'selection.distributeHorizontal': command(
      'selection.distributeHorizontal',
      labels.distributeHorizontal,
      () => editor.distributeNodes([...selection.selectedIds], 'horizontal'),
      selectedCount >= 3
    ),
    'selection.distributeVertical': command(
      'selection.distributeVertical',
      labels.distributeVertical,
      () => editor.distributeNodes([...selection.selectedIds], 'vertical'),
      selectedCount >= 3
    ),
    'selection.booleanUnion': command(
      'selection.booleanUnion',
      labels.unionSelection,
      () => editor.booleanOperationSelected('UNION'),
      selectedCount >= 2
    ),
    'selection.booleanSubtract': command(
      'selection.booleanSubtract',
      labels.subtractSelection,
      () => editor.booleanOperationSelected('SUBTRACT'),
      selectedCount >= 2
    ),
    'selection.booleanIntersect': command(
      'selection.booleanIntersect',
      labels.intersectSelection,
      () => editor.booleanOperationSelected('INTERSECT'),
      selectedCount >= 2
    ),
    'selection.booleanExclude': command(
      'selection.booleanExclude',
      labels.excludeSelection,
      () => editor.booleanOperationSelected('EXCLUDE'),
      selectedCount >= 2
    ),
    'selection.flatten': command(
      'selection.flatten',
      labels.flattenSelection,
      () => editor.flattenSelected(),
      hasSelection
    ),
    'selection.outlineText': command(
      'selection.outlineText',
      labels.outlineText,
      () => editor.outlineTextSelected(),
      selection.selectedNodeType === 'TEXT'
    ),
    'selection.outlineStroke': command(
      'selection.outlineStroke',
      labels.outlineStroke,
      () => editor.outlineStrokeSelected(),
      hasSelection
    ),
    'selection.moveToPage': command(
      'selection.moveToPage',
      labels.moveToPage,
      () => {
        const page = otherPages[0]
        if (page) moveSelectionToPage(page.id)
      },
      hasSelection && otherPages.length > 0
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
      action: () => runCommand(id)
    }
  }

  return { commands, getCommand, runCommand, menuItem, otherPages, moveSelectionToPage }
}
