import type { Editor } from '@open-pencil/core/editor'
import type { Effect, Fill, SceneNode, Stroke } from '@open-pencil/scene-graph'

import { createContext } from '../context/createContext'

type ArrayPropKey = 'fills' | 'strokes' | 'effects'
export type ArrayItemType = Fill | Stroke | Effect

export interface PropertyListContext {
  editor: Editor
  propKey: ArrayPropKey
  items: ArrayItemType[]
  isMixed: boolean
  activeNode: SceneNode | null
  isMulti: boolean
  add: (defaults: ArrayItemType) => void
  remove: (index: number) => void
  update: (index: number, item: ArrayItemType) => void
  patch: (index: number, changes: Partial<ArrayItemType>) => void
  toggleVisibility: (index: number) => void
}

export const [usePropertyList, PropertyListProvider] =
  createContext<PropertyListContext>('PropertyList')
