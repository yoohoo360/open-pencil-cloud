import { createContext } from '../context/createContext'

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

export interface LayerTreeContext {
  editor: Editor
  items: LayerNode[]
  expanded: string[]
  treeKey: number
  selectedIds: Set<string>
  indentPerLevel: number
  select: (id: string, additive: boolean) => void
  toggleExpand: (id: string) => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  rename: (id: string, name: string) => void
  setRowRef: (id: string, el: HTMLElement | null) => void
}

export const [useLayerTree, LayerTreeProvider] = createContext<LayerTreeContext>('LayerTree')
