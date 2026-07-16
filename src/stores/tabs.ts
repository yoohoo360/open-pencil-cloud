import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core'

import { createEditorStore, setActiveEditorStore } from './editor'
import { notifyEditorUI } from './editor-notify'

import type { EditorStore } from './editor'
import type { SceneGraph } from '@open-pencil/core'

export interface Tab {
  id: string
  store: EditorStore
}

export interface TabSummary {
  id: string
  name: string
  isActive: boolean
}

const io = new IORegistry(BUILTIN_IO_FORMATS)

let nextTabId = 1

function generateTabId(): string {
  return `tab-${nextTabId++}`
}

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  notifyEditorUI()
  for (const listener of listeners) listener()
}

export function subscribeTabs(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let tabs: Tab[] = []
let activeTabIdValue = ''

export function getActiveTabId(): string {
  return activeTabIdValue
}

/** @deprecated Use getActiveTabId() — kept for Vue shim compatibility during migration. */
export const activeTabId = {
  get value() {
    return activeTabIdValue
  },
  set value(id: string) {
    activeTabIdValue = id
    emit()
  }
}

export function getActiveTab(): Tab | undefined {
  return tabs.find((t) => t.id === activeTabIdValue)
}

/** @deprecated Use getActiveTab() — Vue computed-shaped shim. */
export const activeTab = {
  get value() {
    return getActiveTab()
  }
}

export function getAllTabSummaries(): TabSummary[] {
  return tabs.map((t) => ({
    id: t.id,
    name: t.store.state.documentName,
    isActive: t.id === activeTabIdValue
  }))
}

/** @deprecated Use getAllTabSummaries() — Vue computed-shaped shim. */
export const allTabs = {
  get value() {
    return getAllTabSummaries()
  }
}

export function getActiveStore(): EditorStore {
  const tab = getActiveTab()
  if (!tab) throw new Error('No active tab')
  return tab.store
}

export function createTab(store?: EditorStore, initialGraph?: SceneGraph): Tab {
  const s = store ?? createEditorStore(initialGraph)
  const tab: Tab = { id: generateTabId(), store: s }
  tabs = [...tabs, tab]
  activateTab(tab)
  return tab
}

function activateTab(tab: Tab) {
  activeTabIdValue = tab.id
  setActiveEditorStore(tab.store)
  window.__OPEN_PENCIL_STORE__ = tab.store
  emit()
}

export function switchTab(tabId: string) {
  const tab = tabs.find((t) => t.id === tabId)
  if (!tab) return
  activateTab(tab)
}

export function closeTab(tabId: string) {
  const idx = tabs.findIndex((t) => t.id === tabId)
  if (idx === -1) return

  const wasActive = activeTabIdValue === tabId
  tabs = tabs.filter((t) => t.id !== tabId)

  if (tabs.length === 0) {
    createTab()
    return
  }

  if (wasActive) {
    const newIdx = Math.min(idx, tabs.length - 1)
    activateTab(tabs[newIdx])
  } else {
    emit()
  }
}

export async function openFileInNewTab(
  file: File,
  _handle?: FileSystemFileHandle,
  _path?: string
): Promise<void> {
  const current = getActiveTab()
  const isUntouched =
    current?.store.state.documentName === 'Untitled' && !current.store.undo.canUndo
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { graph: imported } = await io.readDocument({
    name: file.name,
    mimeType: file.type || undefined,
    data: bytes
  })
  const documentName = file.name.replace(/\.[^.]+$/i, '')

  if (isUntouched && current) {
    current.store.replaceGraph(imported)
    current.store.undo.clear()
    current.store.state.documentName = documentName
    current.store.state.selectedIds = new Set()
    const pageId = current.store.graph.getPages()[0]?.id ?? current.store.graph.rootId
    await current.store.switchPage(pageId)
    emit()
  } else {
    const store = createEditorStore(imported)
    createTab(store)
    store.undo.clear()
    store.state.documentName = documentName
    store.state.selectedIds = new Set()
    const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
    await store.switchPage(pageId)
  }
}

export function tabCount(): number {
  return tabs.length
}

export function useTabsStore() {
  return {
    tabs: allTabs,
    activeTabId,
    createTab,
    switchTab,
    closeTab,
    openFileInNewTab,
    getActiveStore,
    tabCount
  }
}
