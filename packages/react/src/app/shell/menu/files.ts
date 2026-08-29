import { computeAllLayouts } from '@open-pencil/core/layout'
import { BUILTIN_IO_FORMATS, exportFigFile, IORegistry } from '@open-pencil/core/io'
import { browserHTMLToSceneGraph } from '@open-pencil/dom-css/browser'
import { SceneGraph } from '@open-pencil/scene-graph'

import type { EditorStore } from '#react/app/editor/store'
import { dialogMessages } from '#react/i18n/messages'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const DOM_DOCUMENT_EXTENSIONS = ['html', 'htm', 'xhtml'] as const
const READABLE_DOCUMENT_EXTENSIONS = [
  ...new Set([
    ...io.listReadableFormats().flatMap((format) => format.extensions),
    ...DOM_DOCUMENT_EXTENSIONS
  ])
]
const DESIGN_FILE_ACCEPT = READABLE_DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',')

export type SelectionExportFormat = 'png' | 'svg' | 'pptx' | 'fig'

type FileSaveTarget = {
  handle: FileSystemFileHandle | null
  downloadName: string | null
}

const saveTargets = new WeakMap<EditorStore, FileSaveTarget>()

function getSaveTarget(store: EditorStore): FileSaveTarget {
  const existing = saveTargets.get(store)
  if (existing) return existing
  const next: FileSaveTarget = { handle: null, downloadName: null }
  saveTargets.set(store, next)
  return next
}

function clearSaveTarget(store: EditorStore) {
  const target = getSaveTarget(store)
  target.handle = null
  target.downloadName = null
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function copyBytes(data: Uint8Array | string): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data)
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy
}

function downloadBytes(data: Uint8Array | string, filename: string, mimeType: string) {
  const bytes = copyBytes(data)
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function documentNameFromFigPath(path: string): string {
  return (
    path
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.fig$/i, '') ?? 'Untitled'
  )
}

function figFileName(store: EditorStore) {
  const name = store.state.documentName?.trim() || 'Untitled'
  return name.toLowerCase().endsWith('.fig') ? name : `${name}.fig`
}

function isDOMImportFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase()
  return DOM_DOCUMENT_EXTENSIONS.some((extension) => lowerName.endsWith(`.${extension}`))
}

export function isSupportedDesignFile(fileName: string): boolean {
  return io.findReader(fileName) !== null || isDOMImportFile(fileName)
}

function assertSupportedDesignFile(fileName: string): void {
  if (!isSupportedDesignFile(fileName)) {
    throw new Error(`Unsupported document format: ${fileName}`)
  }
}

function getExportFileName(baseName: string, formatId: string, extension: string, scale: number) {
  return formatId === 'png' || formatId === 'jpg' || formatId === 'webp'
    ? `${baseName}@${scale}x.${extension}`
    : `${baseName}.${extension}`
}

function getExportOptions(formatId: string, scale: number): unknown {
  if (formatId === 'png' || formatId === 'jpg' || formatId === 'webp') {
    return { format: formatId.toUpperCase(), scale }
  }
  return undefined
}

function getSelectionExportTarget(store: EditorStore) {
  const ids = [...store.state.selectedIds]
  if (ids.length > 0) return { scope: 'selection' as const, nodeIds: ids }
  return { scope: 'page' as const, pageId: store.state.currentPageId }
}

function getExportBaseName(store: EditorStore, target: ReturnType<typeof getSelectionExportTarget>) {
  if (target.scope === 'selection' && target.nodeIds.length === 1) {
    return store.graph.getNode(target.nodeIds[0])?.name ?? 'Export'
  }
  if (target.scope === 'page') return store.graph.getNode(target.pageId)?.name ?? 'Page'
  return 'Export'
}

async function applyOpenedDocument(store: EditorStore, imported: SceneGraph) {
  const firstPageId = imported.getPages()[0]?.id
  if (firstPageId) computeAllLayouts(imported, firstPageId)
  store.replaceGraph(imported)
  store.undo.clear()
  store.clearSelection()
  const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
  await store.switchPage(pageId)
  store.zoomToFit()
}

function reportOpenFailure(name: string, error: unknown, onError?: (message: string) => void) {
  const detail = errorDetail(error)
  console.error(`Failed to open ${name}:`, error)
  onError?.(dialogMessages.get().openFileFailed({ name, error: detail }))
}

export async function openDesignFileBatch<T>(
  items: Iterable<T>,
  displayName: (item: T) => string,
  openItem: (item: T) => Promise<void>,
  onError?: (message: string) => void
): Promise<void> {
  for (const item of items) {
    try {
      await openItem(item)
    } catch (error) {
      reportOpenFailure(displayName(item), error, onError)
    }
  }
}

export function newDocument(store: EditorStore) {
  const graph = new SceneGraph()
  store.replaceGraph(graph)
  store.undo.clear()
  store.clearSelection()
  store.state.documentName = 'Untitled'
  clearSaveTarget(store)
  const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
  void store.switchPage(pageId)
  store.zoomToFit()
  store.notify()
}

export async function openFileIntoStore(
  store: EditorStore,
  file: File,
  handle?: FileSystemFileHandle
) {
  assertSupportedDesignFile(file.name)
  store.state.loading = true
  store.notify()
  try {
    if (isDOMImportFile(file.name)) {
      const html = await file.text()
      const name = file.name.replace(/\.(html?|xhtml)$/i, '') || 'Untitled'
      const imported = await browserHTMLToSceneGraph(html, { pageName: name })
      await applyOpenedDocument(store, imported)
      store.state.documentName = name
      clearSaveTarget(store)
      return
    }

    const { graph } = await io.readDocument({
      name: file.name,
      mimeType: file.type || undefined,
      data: new Uint8Array(await file.arrayBuffer())
    })
    await applyOpenedDocument(store, graph)
    store.state.documentName = file.name.replace(/\.[^.]+$/i, '') || 'Untitled'
    const target = getSaveTarget(store)
    if (handle && file.name.toLowerCase().endsWith('.fig')) {
      target.handle = handle
      target.downloadName = handle.name
    } else {
      target.handle = null
      target.downloadName = null
    }
  } finally {
    store.state.loading = false
    store.notify()
  }
}

function reportStoreOpenFailure(store: EditorStore) {
  return (message: string) => {
    store.state.actionToast = message
    store.notify()
  }
}

async function openFallbackFileInput(store: EditorStore) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = DESIGN_FILE_ACCEPT
  input.multiple = true
  input.style.display = 'none'
  document.body.appendChild(input)
  input.addEventListener('change', () => {
    const files = input.files ? [...input.files] : []
    input.remove()
    if (files.length === 0) return
    void openDesignFileBatch(
      files,
      (file) => file.name,
      async (file) => {
        assertSupportedDesignFile(file.name)
        await openFileIntoStore(store, file)
      },
      reportStoreOpenFailure(store)
    )
  })
  input.click()
}

export async function openFileDialog(store: EditorStore) {
  if (window.showOpenFilePicker) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: 'Design file',
            accept: {
              'application/octet-stream': ['.fig'],
              'application/json': ['.pen'],
              'text/html': ['.html', '.htm'],
              'application/xhtml+xml': ['.xhtml'],
              'text/plain': ['.pen']
            }
          }
        ]
      })
      await openDesignFileBatch(
        handles,
        (handle) => handle.name,
        async (handle) => {
          const file = await handle.getFile()
          assertSupportedDesignFile(file.name)
          await openFileIntoStore(store, file, handle)
        },
        reportStoreOpenFailure(store)
      )
      return
    } catch (error) {
      if (isAbortError(error)) return
    }
  }

  openFallbackFileInput(store)
}

async function buildFigFile(store: EditorStore) {
  return exportFigFile(store.graph, store.renderer?.ck, store.renderer, store.state.currentPageId)
}

async function writeFigHandle(handle: FileSystemFileHandle, data: Uint8Array) {
  const writable = await handle.createWritable()
  await writable.write(copyBytes(data))
  await writable.close()
}

async function chooseBrowserFigSaveHandle(suggestedName: string) {
  if (!window.showSaveFilePicker) return null
  try {
    return await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Figma file',
          accept: { 'application/octet-stream': ['.fig'] }
        }
      ]
    })
  } catch (error) {
    if (isAbortError(error)) return null
    throw error
  }
}

export async function saveFigFile(store: EditorStore) {
  const target = getSaveTarget(store)
  if (target.handle) {
    const data = await buildFigFile(store)
    await writeFigHandle(target.handle, data)
    return
  }
  if (target.downloadName) {
    const data = await buildFigFile(store)
    downloadBytes(data, target.downloadName, 'application/octet-stream')
    return
  }
  await saveFigFileAs(store)
}

export async function saveFigFileAs(store: EditorStore) {
  const data = await buildFigFile(store)
  const target = getSaveTarget(store)

  if (window.showSaveFilePicker) {
    const handle = await chooseBrowserFigSaveHandle(figFileName(store))
    if (!handle) return
    target.handle = handle
    target.downloadName = handle.name
    store.state.documentName = documentNameFromFigPath(handle.name)
    store.notify()
    await writeFigHandle(handle, data)
    return
  }

  const filename = prompt(dialogMessages.get().saveAsPrompt, target.downloadName ?? figFileName(store))
  if (!filename) return
  target.handle = null
  target.downloadName = filename
  store.state.documentName = documentNameFromFigPath(filename)
  store.notify()
  downloadBytes(data, filename, 'application/octet-stream')
}

export async function exportSelection(
  store: EditorStore,
  formatId: SelectionExportFormat,
  scale = 1
) {
  if (store.state.selectedIds.size === 0) return
  const target = getSelectionExportTarget(store)
  const result = await io.exportContent(
    formatId,
    { graph: store.graph, target },
    getExportOptions(formatId, scale),
    store.renderer ? { canvasKit: store.renderer.ck, renderer: store.renderer } : undefined
  )
  downloadBytes(
    result.data,
    getExportFileName(getExportBaseName(store, target), formatId, result.extension, scale),
    result.mimeType
  )
}

export async function exportSelectionPNG(store: EditorStore) {
  await exportSelection(store, 'png')
}
