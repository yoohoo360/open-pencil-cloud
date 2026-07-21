import { useSyncExternalStore } from 'react'

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

type TabsSnapshot = {
  tabs: Tab[]
  activeTabId: string
}

let snapshot: TabsSnapshot = { tabs: [], activeTabId: '' }
const listeners = new Set<() => void>()

function emit() {
  snapshot = { tabs: snapshot.tabs, activeTabId: snapshot.activeTabId }
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return snapshot
}

export function getActiveTab(): Tab | undefined {
  return snapshot.tabs.find((t) => t.id === snapshot.activeTabId)
}

export function getAllTabs() {
  return snapshot.tabs.map((t) => ({
    id: t.id,
    name: t.store.state.documentName,
    isActive: t.id === snapshot.activeTabId
  }))
}

/** @deprecated Prefer getActiveTab() — kept for gradual migration. */
export const activeTab = {
  get value() {
    return getActiveTab()
  }
}

/** @deprecated Prefer getAllTabs() */
export const allTabs = {
  get value() {
    return getAllTabs()
  }
}

export function getActiveStore(): EditorStore {
  const tab = snapshot.tabs.find((t) => t.id === snapshot.activeTabId)
  if (!tab) throw new Error('No active tab')
  return tab.store
}

export function getActiveTabId(): string {
  return snapshot.activeTabId
}

export function getTabById(tabId: string): Tab | undefined {
  return snapshot.tabs.find((tab) => tab.id === tabId)
}

export function getTabForStore(store: EditorStore): Tab | undefined {
  return snapshot.tabs.find((tab) => tab.store === store)
}

export function getTabsSnapshot(): Tab[] {
  return [...snapshot.tabs]
}

export function createTab(store?: EditorStore, initialGraph?: SceneGraph): Tab {
  const s = store ?? createEditorStore(initialGraph)
  const tab: Tab = { id: generateTabId(), store: s }
  snapshot = { tabs: [...snapshot.tabs, tab], activeTabId: snapshot.activeTabId }
  activateTab(tab)
  return tab
}

function activateTab(tab: Tab) {
  snapshot = { tabs: snapshot.tabs, activeTabId: tab.id }
  setActiveEditorStore(tab.store)
  setOpenPencilStore(tab.store)
  emit()
}

export function switchTab(tabId: string) {
  const tab = snapshot.tabs.find((t) => t.id === tabId)
  if (!tab) return
  activateTab(tab)
}

export function closeTab(tabId: string) {
  const idx = snapshot.tabs.findIndex((t) => t.id === tabId)
  if (idx === -1) return

  const closingTab = snapshot.tabs[idx]
  const wasActive = snapshot.activeTabId === tabId
  const nextTabs = snapshot.tabs.filter((t) => t.id !== tabId)
  snapshot = { tabs: nextTabs, activeTabId: snapshot.activeTabId }

  if (nextTabs.length === 0) {
    createTab()
    closingTab.store.dispose()
    return
  }

  if (wasActive) {
    const newIdx = Math.min(idx, nextTabs.length - 1)
    activateTab(nextTabs[newIdx])
  } else {
    emit()
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
  const current = getActiveTab()
  const isUntouched =
    current?.store.state.documentName === 'Untitled' && !current.store.undo.canUndo
  const store = isUntouched && current ? current.store : createTab().store
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
    emit()
  }
}

export function tabCount(): number {
  return snapshot.tabs.length
}

export function useActiveTab(): Tab | undefined {
  return useSyncExternalStore(subscribe, getActiveTab, getActiveTab)
}

export function useAllTabs() {
  return useSyncExternalStore(subscribe, getAllTabs, getAllTabs)
}

export function useTabsStore() {
  const tabs = useAllTabs()
  const activeTabId = useSyncExternalStore(
    subscribe,
    () => snapshot.activeTabId,
    () => snapshot.activeTabId
  )
  return {
    tabs,
    activeTabId,
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
