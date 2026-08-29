import type { EditorStore } from '#react/app/editor/store'
import { getInMemoryClipboardHTML, rememberClipboardTransfer } from '#react/app/editor/clipboard'
import { hasDocumentTextSelection, isEditing } from '#react/app/shell/keyboard/focus'

const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif'
])

function cursorPosition(store: EditorStore) {
  const { cursorCanvasX: ccx, cursorCanvasY: ccy } = store.state
  return ccx != null && ccy != null ? { x: ccx, y: ccy } : undefined
}

export function extractImageFilesFromClipboard(e: ClipboardEvent): File[] {
  const files = e.clipboardData?.files
  return files ? Array.from(files).filter((file) => RASTER_IMAGE_TYPES.has(file.type)) : []
}

export async function copyAndDeleteSelection(
  store: EditorStore,
  clipboardData: DataTransfer
): Promise<boolean> {
  try {
    await store.writeCopyData(clipboardData)
    rememberClipboardTransfer(clipboardData)
    store.deleteSelected()
    return true
  } catch (error) {
    console.warn('Browser clipboard cut failed', error)
    return false
  }
}

export function bindEditorClipboard(store: EditorStore) {
  function onCopy(e: ClipboardEvent) {
    if (isEditing(e) || hasDocumentTextSelection()) return
    e.preventDefault()
    if (e.clipboardData) {
      void store.writeCopyData(e.clipboardData).then(() => {
        if (e.clipboardData) rememberClipboardTransfer(e.clipboardData)
      })
    }
  }

  function onCut(e: ClipboardEvent) {
    if (isEditing(e)) return
    e.preventDefault()
    if (e.clipboardData) void copyAndDeleteSelection(store, e.clipboardData)
  }

  function onPaste(e: ClipboardEvent) {
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

    const memoryHTML = getInMemoryClipboardHTML()
    if (memoryHTML) {
      void store.pasteFromHTML(memoryHTML, cursorPos)
    }
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
