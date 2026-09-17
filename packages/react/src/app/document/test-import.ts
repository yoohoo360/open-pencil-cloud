import type { SceneGraph } from '@open-pencil/scene-graph'
import { IS_BROWSER } from '@open-pencil/core/constants'

import {
  getLazyFigImportContext,
  isLazyFigImportRootPopulated,
  listPendingLazyFigImportPages
} from '#core/kiwi/fig/lazy-import.override'
import { waitForCanvasPaint, yieldToUI } from '#react/app/document/fig'
import type { EditorStore } from '#react/app/editor/store'
import { importFigIntoStore } from '#react/app/shell/menu/files'

export type OpenPencilTestImportResult = {
  ok: true
  url: string
  fileName: string
  bytes: number
  downloadMs: number
  importMs: number
  totalMs: number
  pages: number
  nodes: number
  firstPageName: string | null
  firstPageChildren: number
}

export type OpenPencilTestImportError = {
  ok: false
  url: string
  error: string
  stack?: string
  totalMs: number
}

let activeStore: EditorStore | null = null

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname
    const leaf = path.split('/').filter(Boolean).pop()
    if (leaf && /\.fig$/i.test(leaf)) return decodeURIComponent(leaf)
  } catch {
    // fall through
  }
  return 'import.fig'
}

export function bindOpenPencilTestImport(store: EditorStore): () => void {
  activeStore = store
  if (!IS_BROWSER) return () => undefined

  const importFigFromUrl = async (
    url: string
  ): Promise<OpenPencilTestImportResult | OpenPencilTestImportError> => {
    const started = performance.now()
    const target = activeStore
    const trimmed = url.trim()
    if (!target) {
      return {
        ok: false,
        url: trimmed,
        error: 'No active editor store. Open /demo or a design document first.',
        totalMs: performance.now() - started
      }
    }

    // Cover download + parse + first paint under the shared canvas loading overlay.
    target.setLoading(true)
    await yieldToUI()
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, 32)
    })
    try {
      const downloadStarted = performance.now()
      const response = await fetch(trimmed)
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`)
      }
      const buffer = await response.arrayBuffer()
      const downloadMs = performance.now() - downloadStarted
      const fileName = fileNameFromUrl(trimmed)
      const file = new File([buffer], fileName, { type: 'application/octet-stream' })

      const importStarted = performance.now()
      await importFigIntoStore(target, file, { alreadyLoading: true })
      await waitForCanvasPaint(target)
      const importMs = performance.now() - importStarted
      const first = target.graph.getPages().find((page) => !page.internalOnly)
      return {
        ok: true,
        url: trimmed,
        fileName,
        bytes: buffer.byteLength,
        downloadMs,
        importMs,
        totalMs: performance.now() - started,
        pages: target.graph.getPages(true).length,
        nodes: [...target.graph.getAllNodes()].length,
        firstPageName: first?.name ?? null,
        firstPageChildren: first ? target.graph.getChildren(first.id).length : 0
      }
    } catch (error) {
      return {
        ok: false,
        url: trimmed,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalMs: performance.now() - started
      }
    } finally {
      target.setLoading(false)
    }
  }

  window.__openPencilImportFigFromUrl = importFigFromUrl
  window.__openPencilGetStore = () => activeStore
  window.__openPencilDebugLazyFig = () => {
    const current = activeStore
    if (!current) return { ok: false as const, error: 'no store' }
    const context = getLazyFigImportContext(current.graph)
    return {
      ok: true as const,
      hasLazy: !!context,
      pending: listPendingLazyFigImportPages(current.graph).length,
      currentPageId: current.state.currentPageId,
      loading: current.state.loading,
      nodes: [...current.graph.getAllNodes()].length,
      pages: current.graph.getPages().map((page) => ({
        id: page.id,
        name: page.name,
        kids: current.graph.getChildren(page.id).length,
        populated: isLazyFigImportRootPopulated(current.graph, page.id)
      }))
    }
  }

  window.__openPencilProfileSwitchPage = async (pageId: string) => {
    const current = activeStore
    if (!current) return { ok: false as const, error: 'no store' }
    let pageChanged = 0
    let renders = 0
    let notifies = 0
    let nodeUpdated = 0
    let nodeAdded = 0
    const offPage = current.onEditorEvent('page:changed', () => {
      pageChanged++
    })
    const offRender = current.onEditorEvent('render:requested', () => {
      renders++
    })
    const emitter = (
      current.graph as SceneGraph & {
        emitter?: { on: (event: string, handler: () => void) => () => void }
      }
    ).emitter
    const offUpdated = emitter?.on('node:updated', () => {
      nodeUpdated++
    })
    const offAdded = emitter?.on('node:created', () => {
      nodeAdded++
    })
    const origNotify = current.notify
    current.notify = () => {
      notifies++
      origNotify()
    }
    const t0 = performance.now()
    await current.switchPage(pageId)
    const switchMs = performance.now() - t0
    current.notify = origNotify
    offPage()
    offRender()
    offUpdated?.()
    offAdded?.()
    return {
      ok: true as const,
      pageId,
      switchMs,
      pageChanged,
      renders,
      notifies,
      nodeUpdated,
      nodeAdded,
      marks: performance
        .getEntriesByType('measure')
        .filter((entry) => entry.name.startsWith('op-page-switch:'))
        .slice(-20)
        .map((entry) => ({ name: entry.name, ms: entry.duration })),
      after: window.__openPencilDebugLazyFig?.()
    }
  }

  return () => {
    if (activeStore === store) activeStore = null
    if (window.__openPencilImportFigFromUrl === importFigFromUrl) {
      delete window.__openPencilImportFigFromUrl
    }
    if (window.__openPencilDebugLazyFig) delete window.__openPencilDebugLazyFig
    if (window.__openPencilGetStore) delete window.__openPencilGetStore
    if (window.__openPencilProfileSwitchPage) delete window.__openPencilProfileSwitchPage
  }
}
