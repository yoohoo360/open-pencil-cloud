import {
  copyEditorSelection,
  cutEditorSelection,
  pasteEditorClipboard
} from '#react/app/editor/clipboard'
import type { EditorStore } from '#react/app/editor/store'

export function createSelectionMenuActions(store: EditorStore) {
  return {
    copy: () => void copyEditorSelection(store),
    cut: () => void cutEditorSelection(store),
    paste: () => void pasteEditorClipboard(store),
    'paste-to-replace': () => void pasteEditorClipboard(store, true),
    'selection.rename': () => {
      if (store.state.selectedIds.size === 0) return
    }
  }
}
