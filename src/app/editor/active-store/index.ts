import type { EditorStore } from '@/app/editor/session'

export type { EditorStore }

let _activeStore: EditorStore | undefined

export function setActiveEditorStore(store: EditorStore) {
  _activeStore = store
}

export function getActiveEditorStore(): EditorStore {
  if (!_activeStore) throw new Error('Editor store not provided')
  return _activeStore
}

export function getActiveEditorStoreOrNull(): EditorStore | null {
  return _activeStore ?? null
}

const storeProxy = new Proxy({} as EditorStore, {
  get(_, prop) {
    return Reflect.get(getActiveEditorStore(), prop)
  }
})

/** Returns a stable proxy that always delegates to the current active store. */
export function useEditorStore(): EditorStore {
  return storeProxy
}
