import type { EditorCommand, EditorCommandId } from '#react/editor/commands/types'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'

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
  const { commands: labels } = useI18n()

  const commands: Record<string, EditorCommand> = {
    'edit.undo': command('edit.undo', labels.undo, () => editor.undo.undo()),
    'edit.redo': command('edit.redo', labels.redo, () => editor.undo.redo()),
    'view.zoomFit': command('view.zoomFit', labels.zoomToFit, () => editor.zoomToFit()),
    'view.zoom100': command('view.zoom100', labels.zoomTo100, () => editor.zoomToLevel(1)),
    'view.zoomSelection': command('view.zoomSelection', labels.zoomToSelection, () =>
      editor.zoomToSelection()
    ),
    'selection.duplicate': command('selection.duplicate', labels.duplicate, () =>
      editor.duplicateSelected()
    ),
    'selection.delete': command('selection.delete', labels.delete, () => editor.deleteSelected()),
    'selection.group': command('selection.group', labels.group, () => editor.groupSelected()),
    'selection.ungroup': command('selection.ungroup', labels.ungroup, () =>
      editor.ungroupSelected()
    ),
    'selection.bringToFront': command('selection.bringToFront', labels.bringToFront, () =>
      editor.bringToFront()
    ),
    'selection.sendToBack': command('selection.sendToBack', labels.sendToBack, () =>
      editor.sendToBack()
    ),
    'selection.toggleLock': command('selection.toggleLock', labels.lockUnlock, () =>
      editor.toggleLock()
    ),
    'selection.goToMainComponent': command(
      'selection.goToMainComponent',
      labels.goToMainComponent,
      () => editor.goToMainComponent()
    ),
    'selection.detachInstance': command(
      'selection.detachInstance',
      labels.detachInstance,
      () => editor.detachInstance()
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

  return { commands, getCommand }
}
