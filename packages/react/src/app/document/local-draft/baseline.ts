import type { EditorStore } from '#react/app/editor/store'

const localDraftBaselineScene = new WeakMap<EditorStore, number>()

/** Treat the current scene as already flushed to IndexedDB (open/import). */
export function markLocalDraftBaseline(store: EditorStore): void {
  localDraftBaselineScene.set(store, store.state.sceneVersion)
}

export function isLocalDraftAtBaseline(store: EditorStore): boolean {
  return localDraftBaselineScene.get(store) === store.state.sceneVersion
}
