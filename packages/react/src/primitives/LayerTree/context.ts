import { createContext } from '#react/internal/create-context'
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

export interface LayerDragInstruction {
  type: 'reorder-above' | 'reorder-below' | 'make-child'
}

export interface LayerTreeContext {
  editor: Editor
  items: LayerNode[]
  expanded: string[]
  treeVersion: number
  selectedIds: ReadonlySet<string>
  indentPerLevel: number
  draggingId: string | null
  instruction: LayerDragInstruction | null
  instructionTargetId: string | null
  setupDrag: (
    el: HTMLElement,
    item: { id: string; level: number; hasChildren: boolean; parentId: string | null }
  ) => (() => void) | undefined
  select: (id: string, additive: boolean) => void
  toggleExpand: (id: string) => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  rename: (id: string, name: string) => void
  setRowRef: (id: string, el: HTMLElement | null) => void
}

export const [useLayerTree, LayerTreeContextProvider] = createContext<LayerTreeContext>('LayerTree')

/** @deprecated Use LayerTreeContextProvider */
export function provideLayerTree(_ctx: LayerTreeContext) {
  throw new Error('[open-pencil] provideLayerTree() is Vue-only.')
}
