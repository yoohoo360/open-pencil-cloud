import { createContext } from '../context/createContext'

import type { SceneNode } from '@open-pencil/core'
import type { Editor } from '@open-pencil/core/editor'

type ArrayPropKey = 'fills' | 'strokes' | 'effects'

export interface PropertyListContext<T = unknown> {
  editor: Editor
  propKey: ArrayPropKey
  items: T[]
  isMixed: boolean
  activeNode: SceneNode | null
  isMulti: boolean
  add: (defaults: T) => void
  remove: (index: number) => void
  update: (index: number, item: T) => void
  patch: (index: number, changes: Partial<T>) => void
  toggleVisibility: (index: number) => void
}

export const [usePropertyList, PropertyListProvider] =
  createContext<PropertyListContext>('PropertyList')
