import { createContext, useContext } from 'react'

import type { Editor } from '@open-pencil/core/editor'

export interface LayerNode {
  id: string
  name: string
  type: string
  layoutMode: string
  visible: boolean
  locked: boolean
  children?: LayerNode[]
}
export interface LayerRow {
  node: LayerNode
  level: number
  hasChildren: boolean
}
export interface LayerSelectionMode {
  additive: boolean
  range: boolean
}
export interface LayerTreeVirtualizer {
  scrollToIndex: (index: number, options?: { align?: 'auto' | 'center' | 'end' | 'start' }) => void
}
export interface LayerDragInstruction {
  type: 'reorder-above' | 'reorder-below' | 'make-child'
}
export interface LayerTreeContext {
  editor: Editor
  items: LayerNode[]
  expanded: ReadonlySet<string>
  visibleRows: LayerRow[]
  treeVersion: number
  selectedIds: ReadonlySet<string>
  focused: boolean
  indentPerLevel: number
  draggingId: string | null
  instruction: LayerDragInstruction | null
  instructionTargetId: string | null
  setupDrag: (element: HTMLElement, item: () => { id: string; level: number; hasChildren: boolean; parentId: string | null }) => () => void
  select: (id: string, selection: boolean | LayerSelectionMode) => void
  toggleExpand: (id: string) => void
  setFocused: (focused: boolean) => void
  setVirtualizer: (virtualizer: LayerTreeVirtualizer) => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  rename: (id: string, name: string) => void
  setRowRef: (id: string, element: HTMLElement | null) => void
}

const LayerTreeContext = createContext<LayerTreeContext | null>(null)
LayerTreeContext.displayName = 'OpenPencilLayerTree'
export const LayerTreeProvider = LayerTreeContext.Provider

export function useLayerTree(): LayerTreeContext {
  const context = useContext(LayerTreeContext)
  if (!context) throw new Error('[open-pencil] useLayerTree() called outside <LayerTreeRoot>')
  return context
}
