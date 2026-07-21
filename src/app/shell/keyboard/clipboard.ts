import { extractImageFilesFromClipboard } from '@open-pencil/react'

import type { EditorStore } from '@/app/editor/active-store'
import {
  copySelectionToTauriClipboard,
  pasteFromTauriClipboard
} from '@/app/editor/clipboard/system'
import { isEditing } from '@/app/shell/keyboard/focus'
import { isTauri } from '@/app/tauri/env'

function cursorPosition(store: EditorStore) {
  const { cursorCanvasX: ccx, cursorCanvasY: ccy } = store.state
  return ccx != null && ccy != null ? { x: ccx, y: ccy } : undefined
}

export function bindEditorClipboard(store: EditorStore) {
  const onCopy = (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    if (isTauri()) {
      void copySelectionToTauriClipboard(store)
      return
    }
    if (e.clipboardData) void store.writeCopyData(e.clipboardData)
  }

  const onCut = (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    if (isTauri()) {
      void copySelectionToTauriClipboard(store).then((copied) => {
        if (copied) store.deleteSelected()
        return undefined
      })
      return
    }
    if (e.clipboardData) void store.writeCopyData(e.clipboardData)
    store.deleteSelected()
  }

  const onPaste = (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()

    const cursorPos = cursorPosition(store)

    const imageFiles = extractImageFilesFromClipboard(e)
    if (imageFiles.length) {
      const cx = cursorPos?.x ?? (-store.state.panX + window.innerWidth / 2) / store.state.zoom
      const cy = cursorPos?.y ?? (-store.state.panY + window.innerHeight / 2) / store.state.zoom
      void store.placeImageFiles(imageFiles, cx, cy)
      return
    }

    const html = e.clipboardData?.getData('text/html') ?? ''
    if (html) {
      void store.pasteFromHTML(html, cursorPos)
      return
    }

    if (isTauri()) void pasteFromTauriClipboard(store, cursorPos)
  }
  window.addEventListener('copy', onCopy)
  window.addEventListener('cut', onCut)
  window.addEventListener('paste', onPaste)
  return () => {
    window.removeEventListener('copy', onCopy)
    window.removeEventListener('cut', onCut)
    window.removeEventListener('paste', onPaste)
  }
}
