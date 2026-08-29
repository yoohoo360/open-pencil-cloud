import type { EditorStore } from '#react/app/editor/store'

export function requestRenameSelection(store: EditorStore): void {
  const selectedIds = [...store.state.selectedIds]
  if (selectedIds.length === 0) return
  store.state.renameNodeId = selectedIds[0]
  store.notify()
}
