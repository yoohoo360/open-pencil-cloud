import { computeAllLayouts } from '@open-pencil/core/layout'
import { BUILTIN_IO_FORMATS, exportFigFile, IORegistry, readFigFile } from '@open-pencil/core/io'

import type { EditorStore } from '#react/app/editor/store'

const io = new IORegistry(BUILTIN_IO_FORMATS)

function downloadBytes(data: Uint8Array | string, filename: string, mimeType: string) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function figFileName(store: EditorStore) {
  const name = store.state.documentName?.trim() || 'Untitled'
  return name.toLowerCase().endsWith('.fig') ? name : `${name}.fig`
}

export async function openFileIntoStore(store: EditorStore, file: File) {
  store.state.loading = true
  store.notify()
  try {
    const imported = await readFigFile(file, { populate: 'first-page' })
    const firstPageId = imported.getPages()[0]?.id
    if (firstPageId) computeAllLayouts(imported, firstPageId)
    store.replaceGraph(imported)
    store.undo.clear()
    store.clearSelection()
    const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
    await store.switchPage(pageId)
    store.state.documentName = file.name.replace(/\.fig$/i, '') || 'Untitled'
    store.zoomToFit()
  } finally {
    store.state.loading = false
    store.notify()
  }
}

export function openFileDialog(store: EditorStore) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.fig,.pen,.html,.htm,.xhtml'
  input.multiple = false
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (!file) return
    void openFileIntoStore(store, file)
  })
  input.click()
}

export async function saveFigFile(store: EditorStore) {
  const data = await exportFigFile(
    store.graph,
    store.renderer?.ck,
    store.renderer,
    store.state.currentPageId
  )
  downloadBytes(data, figFileName(store), 'application/octet-stream')
}

export async function saveFigFileAs(store: EditorStore) {
  await saveFigFile(store)
}

export async function exportSelectionPNG(store: EditorStore) {
  if (store.state.selectedIds.size === 0) return
  for (const id of store.state.selectedIds) {
    const node = store.graph.getNode(id)
    if (!node) continue
    const result = await io.exportContent(
      'png',
      { graph: store.graph, target: { scope: 'node', nodeId: id } },
      { format: 'PNG', scale: 1 },
      store.renderer ? { canvasKit: store.renderer.ck, renderer: store.renderer } : undefined
    )
    downloadBytes(result.data, `${node.name}.png`, result.mimeType)
  }
}
