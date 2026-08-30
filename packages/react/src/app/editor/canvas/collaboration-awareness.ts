import type { CollabPanelContext } from '#react/components/CollabPanel/context'
import type { EditorStore } from '#react/app/editor/store'

export function useCanvasCollaborationAwareness(
  store: EditorStore,
  collab: CollabPanelContext | null
) {
  function updateCursor(cx: number, cy: number) {
    store.state.cursorCanvasX = cx
    store.state.cursorCanvasY = cy
    collab?.updateCursor(cx, cy, store.state.currentPageId)
  }

  return { updateCursor }
}
