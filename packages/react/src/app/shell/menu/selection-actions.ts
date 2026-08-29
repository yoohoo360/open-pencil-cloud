import {
  copyEditorSelection,
  cutEditorSelection,
  pasteEditorClipboard
} from '#react/app/editor/clipboard'
import { requestRenameSelection } from '#react/app/editor/selection/rename-dialog'
import type { EditorStore } from '#react/app/editor/store'

export function createSelectionMenuActions(store: EditorStore) {
  return {
    copy: () => void copyEditorSelection(store),
    cut: () => void cutEditorSelection(store),
    paste: () => void pasteEditorClipboard(store),
    'paste-to-replace': () => void pasteEditorClipboard(store, true),
    'selection.rename': () => requestRenameSelection(store)
  }
}
