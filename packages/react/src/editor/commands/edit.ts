import type { EditorCommandMapOptions } from './context'
import type { EditorCommand } from './types'

type EditCommandId = 'edit.undo' | 'edit.redo'

export function createEditCommands({
  editor,
  capabilities,
  messages: t
}: EditorCommandMapOptions): Record<EditCommandId, EditorCommand> {
  return {
    'edit.undo': {
      id: 'edit.undo',
      get label() {
        return t.undo
      },
      enabled: capabilities.canUndo,
      run: () => editor.undoAction()
    },
    'edit.redo': {
      id: 'edit.redo',
      get label() {
        return t.redo
      },
      enabled: capabilities.canRedo,
      run: () => editor.redoAction()
    }
  }
}
