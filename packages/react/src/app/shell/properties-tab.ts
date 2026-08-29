import { useSyncExternalStore } from 'react'

export type PropertiesTab = 'design' | 'code' | 'ai'

let currentTab: PropertiesTab = 'design'
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function getPropertiesTab(): PropertiesTab {
  return currentTab
}

export function setPropertiesTab(tab: PropertiesTab) {
  if (currentTab === tab) return
  currentTab = tab
  notify()
}

export function subscribePropertiesTab(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function usePropertiesTab(): PropertiesTab {
  return useSyncExternalStore(subscribePropertiesTab, getPropertiesTab, () => 'design')
}
