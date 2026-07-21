import { editorCommandMetadata } from './registry'
import { formatShortcut } from './shortcut'
import type { EditorCommand, EditorCommandId, EditorCommandMenuItem } from './types'

export function createEditorCommandActions(commands: Record<EditorCommandId, EditorCommand>) {
  function getCommand(id: EditorCommandId) {
    return commands[id]
  }

  function runCommand(id: EditorCommandId) {
    const command = commands[id]
    if (command.enabled) command.run()
  }

  function menuItem(
    id: EditorCommandId,
    shortcut = editorCommandMetadata(id).shortcut
  ): EditorCommandMenuItem {
    const command = getCommand(id)
    return {
      id,
      label: command.label,
      shortcut: formatShortcut(shortcut),
      get disabled() {
        return !command.enabled
      },
      action: () => runCommand(id)
    }
  }

  return { getCommand, runCommand, menuItem }
}
