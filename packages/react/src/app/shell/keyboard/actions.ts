import { opacityFromBuffer } from '@open-pencil/core/editor'

import type { EditorStore } from '#react/app/editor/store'
import { exportSelectionPNG as exportSelectionPngFile } from '#react/app/shell/menu/files'
import { getPropertiesTab, setPropertiesTab } from '#react/app/shell/properties-tab'
import type { EditorCommandId } from '#react/editor/commands/types'
import { isBuiltinTextLayer } from '#react/graph/builtin'

type KeyboardActionsOptions = {
  store: EditorStore
  isMobile: () => boolean
  runCommand: (id: EditorCommandId) => void
  setOpacityTarget: (value: number, coalesceKey?: string) => void
}

type NodeEditStore = EditorStore &
  Partial<{
    nodeEditDeleteSelected: () => void
    nodeEditBreakAtVertex: () => void
    exitNodeEditMode: (commit: boolean) => void
  }>

export function createKeyboardActions({
  store,
  isMobile,
  runCommand,
  setOpacityTarget
}: KeyboardActionsOptions) {
  const nodeEditStore = store as NodeEditStore

  function hasNodeEditSelection() {
    return (
      store.state.nodeEditState &&
      (store.state.nodeEditState.selectedVertexIndices.size > 0 ||
        (store.state.nodeEditState.selectedHandles?.size ?? 0) > 0)
    )
  }

  function smartDelete(altKey: boolean) {
    if (hasNodeEditSelection()) {
      if (altKey) nodeEditStore.nodeEditBreakAtVertex?.()
      else nodeEditStore.nodeEditDeleteSelected?.()
      return
    }
    runCommand('selection.delete')
  }

  function confirmOrEnterText() {
    if (store.state.nodeEditState) {
      nodeEditStore.exitNodeEditMode?.(true)
      return
    }
    if (store.state.penState) {
      store.penCommit(false)
      return
    }
    const node = store.getSelectedNode()
    if (node?.type === 'TEXT' && !isBuiltinTextLayer(store.graph, node)) {
      requestAnimationFrame(() => {
        store.startTextEditing(node.id)
        store.textEditor?.selectAll()
        store.requestRender()
      })
    }
  }

  function escapeOrDeselect() {
    if (store.state.nodeEditState) {
      nodeEditStore.exitNodeEditMode?.(true)
      return
    }
    if (store.state.penState) {
      store.penCancel()
      return
    }
    if (store.state.enteredContainerId) {
      store.exitContainer()
      return
    }
    store.clearSelection()
    store.setTool('SELECT')
  }

  function toggleAutoLayout() {
    const node = store.getSelectedNode()
    const selected = store.getSelectedNodes()
    if (node?.type === 'FRAME' && selected.length === 1) {
      store.setLayoutMode(node.id, node.layoutMode === 'NONE' ? 'VERTICAL' : 'NONE')
    } else if (selected.length > 0) {
      runCommand('selection.wrapInAutoLayout')
    }
  }

  function toggleUI() {
    store.setShowUI(!store.state.showUI)
  }

  function toggleAI() {
    if (isMobile()) {
      store.state.activeRibbonTab = store.state.activeRibbonTab === 'ai' ? 'panels' : 'ai'
      if (store.state.mobileDrawerSnap === 'closed') {
        store.state.mobileDrawerSnap = 'half'
      }
      store.notify()
    } else {
      setPropertiesTab(getPropertiesTab() === 'ai' ? 'design' : 'ai')
    }
  }

  function exportSelectionPNG() {
    if (store.state.selectedIds.size === 0) return
    void exportSelectionPngFile(store)
  }

  let opacityBuffer = ''
  let opacitySelectionKey = ''
  let opacityCoalesceKey = ''
  let opacityResetTimer: ReturnType<typeof setTimeout> | undefined

  function resetOpacityBuffer() {
    opacityBuffer = ''
    opacitySelectionKey = ''
    opacityCoalesceKey = ''
    clearTimeout(opacityResetTimer)
  }

  function opacityDigit(digit: string) {
    if (store.state.selectedIds.size === 0) return
    const selectionKey = [...store.state.selectedIds].sort().join('\0')
    if (selectionKey !== opacitySelectionKey) resetOpacityBuffer()
    if (!opacityBuffer) {
      opacitySelectionKey = selectionKey
      opacityCoalesceKey = crypto.randomUUID()
    }
    opacityBuffer += digit
    if (opacityBuffer.length > 3) opacityBuffer = opacityBuffer.slice(-3)
    setOpacityTarget(opacityFromBuffer(opacityBuffer), opacityCoalesceKey)
    runCommand('selection.setOpacity')
    clearTimeout(opacityResetTimer)
    opacityResetTimer = setTimeout(resetOpacityBuffer, 800)
  }

  return {
    smartDelete,
    confirmOrEnterText,
    escapeOrDeselect,
    toggleAutoLayout,
    toggleUI,
    toggleAI,
    exportSelectionPNG,
    opacityDigit
  }
}
