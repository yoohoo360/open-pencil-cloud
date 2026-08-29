import { useSyncExternalStore } from 'react'

let nextTabId = 1

export type TabKind = 'home' | 'document'

export interface Tab {
  id: string
  kind: TabKind
}

let currentTab: Tab | null = { id: `tab-${nextTabId++}`, kind: 'document' }
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeActiveTab(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

export function getActiveTab(): Tab | null {
  return currentTab
}

export const activeTab = {
  get value() {
    return currentTab
  }
}

export function setActiveTab(tab: Tab | null) {
  currentTab = tab
  notify()
}

export function createTab() {
  currentTab = { id: `tab-${nextTabId++}`, kind: 'document' }
  notify()
}

export function closeTab(id: string) {
  if (currentTab?.id !== id) return
  currentTab = null
  notify()
}

export function useActiveTab(): Tab | null {
  return useSyncExternalStore(subscribeActiveTab, getActiveTab, () => null)
}
