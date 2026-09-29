import { persistCloudSceneGraph } from '#react/app/document/cloud-document'
import { markCloudDocumentPersisted, saveCloudCover } from '#react/app/document/cloud-persist'
import {
  readFigDocument,
  finishFigImport,
  waitForCanvasPaint,
  yieldToUI
} from '#react/app/document/fig'
import { withDocumentBusy } from '#react/app/document/busy/store'
import { clearLocalDraftAfterCloudSave } from '#react/app/document/local-draft/persist'
import { maybeRecordAutosave } from '#react/app/document/version-history/record'
import type { EditorStore } from '#react/app/editor/store'
import { dialogMessages } from '#react/i18n/messages'
import { encodeUtf8 } from '#react/polyfills/utf8'

import { BUILTIN_IO_FORMATS, exportFigFile, IORegistry } from '@open-pencil/core/io'
import { browserHTMLToSceneGraph } from '@open-pencil/dom-css/browser'
import { SceneGraph } from '@open-pencil/scene-graph'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const DOM_DOCUMENT_EXTENSIONS = ['html', 'htm', 'xhtml'] as const
const READABLE_DOCUMENT_EXTENSIONS = [
  ...new Set([
    ...io.listReadableFormats().flatMap((format) => format.extensions),
    ...DOM_DOCUMENT_EXTENSIONS
  ])
]
const DESIGN_FILE_ACCEPT = READABLE_DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(
  ','
)

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

function clearRemoteDocument(store: EditorStore) {
  store.state.documentVersion = ''
  store.state.documentFigURL = ''
  store.state.documentKey = ''
}

/** True when the editor is bound to a cloud document (keep identity across local imports). */
function hasRemoteDocument(store: EditorStore): boolean {
  return Boolean(store.state.documentFigURL?.trim() || store.state.documentKey?.trim())
}

function applyLocalDocumentIdentity(store: EditorStore, documentName: string): void {
  // Importing into an open cloud doc replaces graph content only — do not detach
  // documentFigURL / documentKey / documentName / documentVersion.
  if (hasRemoteDocument(store)) {
    clearSaveTarget(store)
    return
  }
  store.state.documentName = documentName
  clearRemoteDocument(store)
  clearSaveTarget(store)
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
  if (typeof data === 'string') return encodeUtf8(data)
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

function getExportBaseName(
  store: EditorStore,
  target: ReturnType<typeof getSelectionExportTarget>
) {
  if (target.scope === 'selection' && target.nodeIds.length === 1) {
    return store.graph.getNode(target.nodeIds[0])?.name ?? 'Export'
  }
  if (target.scope === 'page') return store.graph.getNode(target.pageId)?.name ?? 'Page'
  return 'Export'
}

async function applyOpenedDocument(store: EditorStore, imported: SceneGraph) {
  await finishFigImport(store, imported)
}

function assertFigImportFile(name: string) {
  if (!/\.fig$/i.test(name)) {
    throw new Error(`Unsupported file type: ${name}`)
  }
}

/** Import a `.fig` file into the active store (URL test import + file picker). */
export async function importFigIntoStore(
  store: EditorStore,
  file: File,
  options?: { alreadyLoading?: boolean }
): Promise<void> {
  assertFigImportFile(file.name)
  const ownLoading = !options?.alreadyLoading
  if (ownLoading) {
    const { setPageLoadingPhase } = await import('#react/app/document/page-loading/controller')
    const { pageLoadingLabels } = await import('#react/app/document/page-loading/labels')
    setPageLoadingPhase(store, pageLoadingLabels.loadingDocument)
    await yieldToUI()
    setPageLoadingPhase(store, pageLoadingLabels.loadingDocument)
  }
  try {
    // Page 1 (+ warm page 2) first; remaining pages stay lazy. Origin fix is
    // applied directly on graph CANVAS / child x,y after those pages exist —
    // never by mutating kiwi changeMap.
    const graph = await readFigDocument(file, store, undefined, {
      useWorker: false
    })
    await applyOpenedDocument(store, graph)
    try {
      const { normalizeImportedPageOrigins } = await import(
        '#react/app/document/normalize-page-origin'
      )
      normalizeImportedPageOrigins(store.graph)
    } catch (error) {
      console.warn('[FigImport] page origin normalize failed', error)
    }
    applyLocalDocumentIdentity(store, file.name.replace(/\.fig$/i, '') || 'Untitled')
    await waitForCanvasPaint(store)
    const { acknowledgeDocumentSceneBaseline } = await import(
      '#react/app/document/persist-baseline'
    )
    acknowledgeDocumentSceneBaseline(store)
  } finally {
    if (ownLoading) {
      const { setPageLoadingVisible } = await import('#react/app/document/page-loading/controller')
      // finishFigImport already dismisses after 2 pages; ensure cleared on error.
      if (store.state.pageLoading.visible || store.state.loading) {
        setPageLoadingVisible(store, false)
      }
    }
  }
}

/** Alias used by the app menu / mobile HUD — same as the design-file open dialog. */
export async function importFigDialog(store: EditorStore): Promise<void> {
  await openFileDialog(store)
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
  clearRemoteDocument(store)
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

  // `.fig` must use the lazy main-thread reader (same as URL test import). The
  // generic IO registry defaults to a worker session whose lazy context never
  // lands on the editor graph, so later pages stay empty / loading sticks.
  if (/\.fig$/i.test(file.name)) {
    await importFigIntoStore(store, file)
    // Cloud-bound docs keep saving to OSS; do not attach a local file handle.
    if (hasRemoteDocument(store)) return
    const target = getSaveTarget(store)
    if (handle) {
      target.handle = handle
      target.downloadName = handle.name
    } else {
      target.handle = null
      target.downloadName = null
    }
    return
  }

  store.setLoading(true)
  await yieldToUI()
  try {
    if (isDOMImportFile(file.name)) {
      const html = await file.text()
      const name = file.name.replace(/\.(html?|xhtml)$/i, '') || 'Untitled'
      const imported = await browserHTMLToSceneGraph(html, { pageName: name })
      await applyOpenedDocument(store, imported)
      applyLocalDocumentIdentity(store, name)
    } else {
      const { graph } = await io.readDocument({
        name: file.name,
        mimeType: file.type || undefined,
        data: new Uint8Array(await file.arrayBuffer())
      })
      await applyOpenedDocument(store, graph)
      applyLocalDocumentIdentity(store, file.name.replace(/\.[^.]+$/i, '') || 'Untitled')
    }
    await waitForCanvasPaint(store)
  } finally {
    store.setLoading(false)
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
  // Let the save gesture paint before the encode pipeline starts.
  await yieldToUI()
  return exportFigFile(
    store.graph,
    store.renderer?.ck,
    store.renderer ?? undefined,
    store.state.currentPageId,
    false,
    // Always write live kiwi blobs + images/ into the archive.
    { reuseOriginalArchive: false }
  )
}

export async function exportCurrentFig(store: EditorStore) {
  return buildFigFile(store)
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

function reportSaveFailure(_store: EditorStore, error: unknown) {
  console.error('[Document] Save failed', error)
}

export type SaveFigFileOptions = {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}

type CloudSaveSlot = {
  promise: Promise<void>
  rerun: boolean
  callbacks: SaveFigFileOptions[]
}

const cloudSaveSlots = new WeakMap<EditorStore, CloudSaveSlot>()

/**
 * Save the open document. Cloud saves run in the background (do not block the
 * UI); pass onSuccess / onError for completion callbacks.
 */
export function saveFigFile(store: EditorStore, options?: SaveFigFileOptions): Promise<void> {
  const remoteURL = store.state.documentFigURL?.trim()
  if (remoteURL) {
    const existing = cloudSaveSlots.get(store)
    if (existing) {
      existing.rerun = true
      if (options) existing.callbacks.push(options)
      return existing.promise
    }

    const slot: CloudSaveSlot = {
      promise: Promise.resolve(),
      rerun: false,
      callbacks: options ? [options] : []
    }

    slot.promise = (async () => {
      for (;;) {
        slot.rerun = false
        const callbacks = slot.callbacks.splice(0)
        try {
          await withDocumentBusy(dialogMessages.get().savingDocument, async () => {
            // Let the key/menu handler finish and paint before encode/upload.
            await yieldToUI()
            const bytes = await persistCloudSceneGraph(store)
            markCloudDocumentPersisted(store)
            void maybeRecordAutosave(store, bytes)
            void clearLocalDraftAfterCloudSave(store).catch((error) => {
              console.warn('[LocalDraft] Clear after save failed', error)
            })
            try {
              await withDocumentBusy(dialogMessages.get().savingThumbnail, () => saveCloudCover(store))
            } catch (error) {
              console.warn('[Document] Cover save failed', error)
            }
          })
          for (const callback of callbacks) callback.onSuccess?.()
        } catch (error) {
          reportSaveFailure(store, error)
          for (const callback of callbacks) callback.onError?.(error)
        }
        if (!slot.rerun) break
      }
    })().finally(() => {
      if (cloudSaveSlots.get(store) === slot) cloudSaveSlots.delete(store)
    })

    cloudSaveSlots.set(store, slot)
    return slot.promise
  }

  if (store.state.documentKey?.trim()) {
    console.warn(
      '[Document] Cloud document key is set but documentFigURL is empty; falling back to local save'
    )
  }

  return (async () => {
    try {
      await withDocumentBusy(dialogMessages.get().savingDocument, async () => {
        const target = getSaveTarget(store)
        if (target.handle || target.downloadName) {
          const data = await buildFigFile(store)
          if (target.handle) {
            await writeFigHandle(target.handle, data)
          } else {
            downloadBytes(data, target.downloadName ?? figFileName(store), 'application/octet-stream')
          }
          options?.onSuccess?.()
          return
        }
        if (!(await saveFigFileAs(store))) return
        options?.onSuccess?.()
      })
    } catch (error) {
      if (isAbortError(error)) return
      reportSaveFailure(store, error)
      options?.onError?.(error)
    }
  })()
}

export async function saveFigFileAs(store: EditorStore): Promise<boolean> {
  const data = await buildFigFile(store)
  const target = getSaveTarget(store)

  if (window.showSaveFilePicker) {
    const handle = await chooseBrowserFigSaveHandle(figFileName(store))
    if (!handle) return false
    target.handle = handle
    target.downloadName = handle.name
    store.state.documentName = documentNameFromFigPath(handle.name)
    store.notify()
    await writeFigHandle(handle, data)
    return true
  }

  const filename = prompt(
    dialogMessages.get().saveAsPrompt,
    target.downloadName ?? figFileName(store)
  )
  if (!filename) return false
  target.handle = null
  target.downloadName = filename
  store.state.documentName = documentNameFromFigPath(filename)
  store.notify()
  downloadBytes(data, filename, 'application/octet-stream')
  return true
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
