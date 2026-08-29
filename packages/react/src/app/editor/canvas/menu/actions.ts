import { nodeToXPath } from '@open-pencil/core/xpath'

import {
  copyEditorSelection,
  cutEditorSelection,
  pasteEditorClipboard
} from '#react/app/editor/clipboard'
import type { EditorStore } from '#react/app/editor/store'

export function createCanvasMenuActions(store: EditorStore, selectedIds: Set<string>) {
  function ids() {
    return [...selectedIds]
  }

  function execCommand(cmd: 'copy' | 'cut' | 'paste') {
    if (cmd === 'copy') void copyEditorSelection(store)
    if (cmd === 'cut') void cutEditorSelection(store)
    if (cmd === 'paste') void pasteEditorClipboard(store)
  }

  async function clipboardWrite(text: string | null) {
    if (!text) return
    await navigator.clipboard.writeText(text)
  }

  return {
    ids,
    execCommand,
    pasteToReplace: () => void pasteEditorClipboard(store, true),
    clipboardWrite,
    copyNodeId: () => clipboardWrite(ids().join(', ')),
    copyXPath: () => {
      const xpaths = ids()
        .map((id) => nodeToXPath(store.graph, id))
        .filter((xpath): xpath is string => xpath !== null)
      return clipboardWrite(xpaths.join('\n'))
    },
    copyAsPNG: async () => {
      const svg = store.copySelectionAsSVG(ids())
      if (svg) await navigator.clipboard.writeText(svg)
    }
  }
}
