import type { ReactNode, ElementType } from 'react'

import type { Effect, Fill, Stroke } from '@open-pencil/scene-graph'

export interface PropertyListItemMap {
  fills: Fill
  strokes: Stroke
  effects: Effect
}

export type PropertyListKey = keyof PropertyListItemMap
export type PropertyListItemFor<K extends PropertyListKey> = PropertyListItemMap[K]
export type PropertyListPatchFor<K extends PropertyListKey> = Partial<PropertyListItemFor<K>>
export type PropertyListIdentity = string | number

export interface PropertyListActions<K extends PropertyListKey> {
  add(item: PropertyListItemFor<K>): void
  remove(index: number): void
  update(index: number, item: PropertyListItemFor<K>): void
  patch(index: number, changes: PropertyListPatchFor<K>): void
  toggleVisibility(index: number): void
  reorder(fromIndex: number, toIndex: number): void
}

export interface PropertyListContext<K extends PropertyListKey = PropertyListKey> {
  propKey: K
  items: PropertyListItemFor<K>[]
  isMixed: boolean
  disabled: boolean
  keyOf(item: PropertyListItemFor<K>, index: number): PropertyListIdentity
  actions: PropertyListActions<K>
}

export interface PropertyListRootProps<K extends PropertyListKey> {
  propKey: K
  items: PropertyListItemFor<K>[]
  mixed?: boolean
  disabled?: boolean
  getKey?: (item: PropertyListItemFor<K>, index: number) => PropertyListIdentity
  label?: string
}

export interface PropertyListRootSlotProps<K extends PropertyListKey> {
  items: PropertyListItemFor<K>[]
  isMixed: boolean
  disabled: boolean
  keyOf(item: PropertyListItemFor<K>, index: number): PropertyListIdentity
  actions: PropertyListActions<K>
}

export type PropertyListRootSlots<K extends PropertyListKey> =
  ReactNode | ((props: PropertyListRootSlotProps<K>) => ReactNode)

export interface PropertyListItemActions<K extends PropertyListKey> {
  update(item: PropertyListItemFor<K>): void
  patch(changes: PropertyListPatchFor<K>): void
  remove(): void
  toggleVisibility(): void
}

export interface PropertyListPartProps<K extends PropertyListKey> {
  propKey: K
  as?: ElementType
  asChild?: boolean
  disabled?: boolean
}

export interface PropertyListItemSlotProps<K extends PropertyListKey> {
  item: PropertyListItemFor<K> | undefined
  index: number
  hidden: boolean
  dragging: boolean
  disabled: boolean
  actions: PropertyListItemActions<K>
}
