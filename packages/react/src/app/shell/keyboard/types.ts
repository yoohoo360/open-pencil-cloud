import type { EditorCommandId } from '#react/editor/commands/types'
import type { EditorStore } from '#react/app/editor/store'

export type KeyboardShortcutActions = {
  smartDelete: (altKey: boolean) => void
  confirmOrEnterText: () => void
  escapeOrDeselect: () => void
  toggleAutoLayout: () => void
  toggleUI: () => void
  toggleAI: () => void
  exportSelectionPNG: () => void
  opacityDigit: (digit: string) => void
}

export type KeyboardShortcutOptions = {
  inputFocused: () => boolean
  store: EditorStore
  runCommand: (id: EditorCommandId) => void
  actions: KeyboardShortcutActions
  openFileDialog: () => void
  closeActiveTab: () => void
  createTab: () => void
}

export type KeyboardShortcutRunOptions = KeyboardShortcutOptions & {
  keyEvent: KeyboardEvent
  spaceTool: { resetToolBeforeSpace: () => void }
}
