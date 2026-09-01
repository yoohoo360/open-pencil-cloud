import { hydrateBuiltinInstances } from '#react/controls/builtin-text/hydrate'
import { resolveSelectedInsertionParent } from '#react/controls/component-props/slot-insert'

import type { Editor } from '@open-pencil/core/editor'
import type { Vector } from '@open-pencil/scene-graph/primitives'

let memoryHtml = ''

export function getInMemoryClipboardHTML() {
  return memoryHtml
}

export function rememberClipboardTransfer(transfer: DataTransfer) {
  memoryHtml = transfer.getData('text/html') || transfer.getData('text/plain')
}

function cursorPos(editor: Editor): Vector | undefined {
  const x = editor.state.cursorCanvasX
  const y = editor.state.cursorCanvasY
  if (x == null || y == null) return undefined
  return { x, y }
}

export async function copyEditorSelection(editor: Editor): Promise<boolean> {
  const transfer = new DataTransfer()
  await editor.writeCopyData(transfer)
  const html = transfer.getData('text/html')
  const text = transfer.getData('text/plain')
  if (!html && !text) return false
  rememberClipboardTransfer(transfer)
  if (!memoryHtml) memoryHtml = html || text
  try {
    const item: Record<string, Blob> = {}
    if (html) item['text/html'] = new Blob([html], { type: 'text/html' })
    if (text) item['text/plain'] = new Blob([text], { type: 'text/plain' })
    await navigator.clipboard.write([new ClipboardItem(item)])
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(text || html)
      return true
    } catch {
      return Boolean(memoryHtml)
    }
  }
}

export async function cutEditorSelection(editor: Editor): Promise<boolean> {
  const ok = await copyEditorSelection(editor)
  if (ok) editor.deleteSelected()
  return ok
}

export async function pasteEditorClipboard(editor: Editor, replace = false): Promise<boolean> {
  let html = memoryHtml
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      if (!item.types.includes('text/html')) continue
      html = await (await item.getType('text/html')).text()
      break
    }
    if (!html) {
      const text = await navigator.clipboard.readText()
      if (text) html = text
    }
  } catch {
    /* fall back to in-memory HTML */
  }
  if (!html) return false
  const parentId = resolveSelectedInsertionParent(editor)
  const previous = editor.state.enteredContainerId
  if (parentId !== editor.state.currentPageId) editor.state.enteredContainerId = parentId
  try {
    await editor.pasteFromHTML(html, cursorPos(editor), { replaceSelection: replace })
    hydrateBuiltinInstances(editor)
  } finally {
    editor.state.enteredContainerId = previous
  }
  return true
}
