import { atom, computed } from 'nanostores'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { readFigFile } from '@open-pencil/core/io/formats/fig'
import { computeAllLayouts } from '@open-pencil/core/layout'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { setOpenPencilStore } from '@/app/browser-bridge'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session'
import type { EditorStore } from '@/app/editor/session'

export interface Tab {
  id: string
  store: EditorStore
}

const io = new IORegistry(BUILTIN_IO_FORMATS)

let nextTabId = 1

function generateTabId(): string {
  return `tab-${nextTabId++}`
}

export const $tabs = atom<Tab[]>([])
export const $activeTabId = atom<string>('')

export const activeTab = computed($tabs, (tabs) => tabs.find((t) => t.id === $activeTabId.get()))

export const allTabs = computed([$tabs, $activeTabId], (tabs, activeId) =>
  tabs.map((t) => ({
    id: t.id,
    name: t.store.state.documentName,
    isActive: t.id === activeId
  }))
)

export function getActiveStore(): EditorStore {
  const tabs = $tabs.get()
  const activeId = $activeTabId.get()
  const tab = tabs.find((t) => t.id === activeId)
  if (!tab) throw new Error('No active tab')
  return tab.store
}

export function getActiveTabId(): string {
  return $activeTabId.get()
}

export function getTabById(tabId: string): Tab | undefined {
  return $tabs.get().find((tab) => tab.id === tabId)
}

export function getTabForStore(store: EditorStore): Tab | undefined {
  return $tabs.get().find((tab) => tab.store === store)
}

export function getTabsSnapshot(): Tab[] {
  return [...$tabs.get()]
}

export function createTab(store?: EditorStore, initialGraph?: SceneGraph): Tab {
  const s = store ?? createEditorStore(initialGraph)
  const tab: Tab = { id: generateTabId(), store: s }
  $tabs.set([...$tabs.get(), tab])
  activateTab(tab)
  return tab
}

function activateTab(tab: Tab) {
  $activeTabId.set(tab.id)
  setActiveEditorStore(tab.store)
  setOpenPencilStore(tab.store)
}

export function switchTab(tabId: string) {
  const tab = $tabs.get().find((t) => t.id === tabId)
  if (!tab) return
  activateTab(tab)
}

export function closeTab(tabId: string) {
  const tabs = $tabs.get()
  const idx = tabs.findIndex((t) => t.id === tabId)
  if (idx === -1) return

  const closingTab = tabs[idx]
  const wasActive = $activeTabId.get() === tabId
  const newTabs = tabs.filter((t) => t.id !== tabId)
  $tabs.set(newTabs)

  if (newTabs.length === 0) {
    createTab()
    closingTab.store.dispose()
    return
  }

  if (wasActive) {
    const newIdx = Math.min(idx, newTabs.length - 1)
    activateTab(newTabs[newIdx])
  }

  closingTab.store.dispose()
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function isDOMImportFile(file: File): boolean {
  return /\.(html?|xhtml)$/i.test(file.name)
}

export async function openFileInNewTab(
  file: File,
  handle?: FileSystemFileHandle,
  path?: string
): Promise<void> {
  const tabs = $tabs.get()
  const activeId = $activeTabId.get()
  const current = tabs.find((t) => t.id === activeId)
  const isUntouched =
    current?.store.state.documentName === 'Untitled' && !current.store.undo.canUndo
  const store = isUntouched ? current.store : createTab().store
  if (isDOMImportFile(file)) {
    await store.openDOMFile(file, { handle, path })
    return
  }

  const documentName = file.name.replace(/\.[^.]+$/i, '')

  store.state.documentName = documentName
  store.state.loading = true
  await yieldToUI()

  try {
    const isFig = file.name.toLowerCase().endsWith('.fig')
    const { graph: imported, sourceFormat } = isFig
      ? { graph: await readFigFile(file, { populate: 'first-page' }), sourceFormat: 'fig' }
      : await io.readDocument({
          name: file.name,
          mimeType: file.type || undefined,
          data: new Uint8Array(await file.arrayBuffer())
        })

    const firstPageId = imported.getPages()[0]?.id
    if (firstPageId) computeAllLayouts(imported, firstPageId)
    store.replaceGraph(imported)
    store.undo.clear()
    store.setDocumentSource(file.name, sourceFormat, handle, path)
    store.clearSelection()
    const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
    await store.switchPage(pageId)
    await store.fitCurrentPageToViewport()
  } finally {
    store.state.loading = false
  }
}

export function tabCount(): number {
  return $tabs.get().length
}

export function useTabsStore() {
  return {
    $tabs,
    $activeTabId,
    activeTab,
    allTabs,
    createTab,
    switchTab,
    closeTab,
    getActiveTabId,
    getTabById,
    getTabForStore,
    getTabsSnapshot,
    openFileInNewTab,
    getActiveStore,
    tabCount
  }
}
