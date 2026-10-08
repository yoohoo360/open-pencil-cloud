import { hydrateHostedInstances } from '#react/hosted-components'
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

export function rememberClipboardPayload(payload: { html: string; plainText: string }) {
  memoryHtml = payload.html || payload.plainText
}

function cursorPos(editor: Editor): Vector | undefined {
  const x = editor.state.cursorCanvasX
  const y = editor.state.cursorCanvasY
  if (x == null || y == null) return undefined
  return { x, y }
}

function applyPayloadToTransfer(
  transfer: DataTransfer,
  payload: { html: string; plainText: string }
) {
  if (payload.html) transfer.setData('text/html', payload.html)
  if (payload.plainText) transfer.setData('text/plain', payload.plainText)
}

export async function copyEditorSelection(editor: Editor): Promise<boolean> {
  const payload = await editor.prepareCopy()
  if (!payload.html && !payload.plainText) return false
  rememberClipboardPayload(payload)
  try {
    const item: Record<string, Blob> = {}
    if (payload.html) item['text/html'] = new Blob([payload.html], { type: 'text/html' })
    if (payload.plainText) item['text/plain'] = new Blob([payload.plainText], { type: 'text/plain' })
    await navigator.clipboard.write([new ClipboardItem(item)])
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(payload.plainText || payload.html)
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
    hydrateHostedInstances(editor)
  } finally {
    editor.state.enteredContainerId = previous
  }
  return true
}

export async function writePreparedCopy(
  editor: Editor,
  transfer: DataTransfer
): Promise<boolean> {
  const payload = await editor.prepareCopy()
  if (!payload.html && !payload.plainText) return false
  applyPayloadToTransfer(transfer, payload)
  rememberClipboardPayload(payload)
  return true
}
