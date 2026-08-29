import type { EditorState } from '@open-pencil/core/editor'
import { copyEditorViewState, pickEditorViewState } from '@open-pencil/core/editor'

import {
  closePaneNode,
  containsPane,
  leafPaneIds,
  MAX_VISIBLE_CANVAS_PANES,
  paneCount,
  splitPaneNode,
  updateSplitSizes
} from '#react/editor/panes/split-tree'
import type { CanvasSplitNode, SplitDirection } from '#react/editor/panes/split-tree'
import { cloneCanvasPaneState, createCanvasPaneState } from '#react/editor/panes/state'
import type { CanvasPaneState } from '#react/editor/panes/state'

export function createCanvasPaneRegistry(state: EditorState, onChange: () => void) {
  let nextPaneIndex = 1
  let nextSplitIndex = 1
  const initialPane = createCanvasPaneState(`pane-${nextPaneIndex++}`, state)
  const panes = new Map<string, CanvasPaneState>([[initialPane.id, initialPane]])
  let activePaneId = initialPane.id
  let splitTree: CanvasSplitNode = { type: 'pane', paneId: initialPane.id }

  function getPane(paneId: string): CanvasPaneState | undefined {
    return panes.get(paneId)
  }

  function syncPaneFromState(pane: CanvasPaneState): void {
    const view = copyEditorViewState(pickEditorViewState(state))
    pane.currentPageId = view.currentPageId
    pane.zoom = view.zoom
    pane.panX = view.panX
    pane.panY = view.panY
  }

  function syncStateFromPane(pane: CanvasPaneState): void {
    Object.assign(state, {
      currentPageId: pane.currentPageId,
      zoom: pane.zoom,
      panX: pane.panX,
      panY: pane.panY
    })
  }

  function getPaneRenderState(paneId: string): EditorState {
    const pane = getPane(paneId)
    if (!pane || paneId === activePaneId) return state
    return { ...state, ...pane } satisfies EditorState
  }

  function setActivePane(paneId: string): boolean {
    if (paneId === activePaneId) return true
    const pane = getPane(paneId)
    if (!containsPane(splitTree, paneId) || !pane) return false
    const current = getPane(activePaneId)
    if (current) syncPaneFromState(current)
    syncStateFromPane(pane)
    activePaneId = paneId
    state.renderVersion++
    onChange()
    return true
  }

  function splitPane(paneId: string, direction: SplitDirection) {
    const source = getPane(paneId)
    if (!source || paneCount(splitTree) >= MAX_VISIBLE_CANVAS_PANES) return null
    if (paneId === activePaneId) syncPaneFromState(source)
    const pane = cloneCanvasPaneState(`pane-${nextPaneIndex++}`, source)
    splitTree = splitPaneNode(splitTree, paneId, pane.id, `split-${nextSplitIndex++}`, direction)
    panes.set(pane.id, pane)
    setActivePane(pane.id)
    return pane
  }

  function closePane(paneId: string): boolean {
    if (paneCount(splitTree) <= 1 || !getPane(paneId)) return false
    const nextTree = closePaneNode(splitTree, paneId)
    if (!nextTree) return false
    panes.delete(paneId)
    splitTree = nextTree
    if (activePaneId === paneId) {
      const nextPaneId = leafPaneIds(nextTree)[0] ?? initialPane.id
      const nextPane = getPane(nextPaneId)
      if (nextPane) syncStateFromPane(nextPane)
      activePaneId = nextPaneId
      state.renderVersion++
    }
    onChange()
    return true
  }

  function resizePane(paneId: string, width: number, height: number): void {
    const pane = getPane(paneId)
    if (!pane) return
    pane.viewportWidth = width
    pane.viewportHeight = height
  }

  function setSplitSizes(splitId: string, sizes: number[]): void {
    splitTree = updateSplitSizes(splitTree, splitId, sizes)
    onChange()
  }

  return {
    get activePaneId() {
      return activePaneId
    },
    get splitTree() {
      return splitTree
    },
    get visiblePaneCount() {
      return paneCount(splitTree)
    },
    getPane,
    getPaneRenderState,
    setActivePane,
    splitPane,
    closePane,
    resizePane,
    setSplitSizes,
    maxVisiblePanes: MAX_VISIBLE_CANVAS_PANES
  }
}

export type CanvasPaneRegistry = ReturnType<typeof createCanvasPaneRegistry>
