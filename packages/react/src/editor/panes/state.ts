import type { EditorState } from '@open-pencil/core/editor'
import { copyEditorViewState, pickEditorViewState } from '@open-pencil/core/editor'

export interface CanvasPaneState {
  id: string
  viewportWidth: number
  viewportHeight: number
  currentPageId: string
  zoom: number
  panX: number
  panY: number
}

export function createCanvasPaneState(
  id: string,
  state: EditorState
): CanvasPaneState {
  const view = copyEditorViewState(pickEditorViewState(state))
  return {
    id,
    viewportWidth: 0,
    viewportHeight: 0,
    currentPageId: view.currentPageId,
    zoom: view.zoom,
    panX: view.panX,
    panY: view.panY
  }
}

export function cloneCanvasPaneState(id: string, source: CanvasPaneState): CanvasPaneState {
  return {
    ...source,
    id
  }
}
