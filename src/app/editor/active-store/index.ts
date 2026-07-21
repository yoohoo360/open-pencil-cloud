import { useSyncExternalStore } from 'react'

import type { EditorStore } from '@/app/editor/session'

export type { EditorStore }

let activeStore: EditorStore | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return activeStore
}

/**
 * Compatibility wrapper for consumers that still read `.value`.
 * New React components should use `useActiveEditorStore`.
 */
export const activeEditorStoreRef = {
  get value() {
    return activeStore
  }
}

export function useActiveEditorStoreRef() {
  return activeEditorStoreRef
}

export function setActiveEditorStore(store: EditorStore) {
  activeStore = store
  for (const listener of listeners) listener()
}

export function getActiveEditorStore(): EditorStore {
  if (!activeStore) throw new Error('Editor store not provided')
  return activeStore
}

export function getActiveEditorStoreOrNull(): EditorStore | null {
  return activeStore ?? null
}

export function useActiveEditorStore(): EditorStore | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) ?? null
}

const storeProxy = new Proxy({} as EditorStore, {
  get(_, prop) {
    return Reflect.get(getActiveEditorStore(), prop)
  }
})

export function useEditorStore(): EditorStore {
  return storeProxy
}
