import type { ReactNode } from 'react'

import { PropertyListProvider } from '#react/primitives/PropertyList/context'
import type {
  PropertyListActions,
  PropertyListContext,
  PropertyListIdentity,
  PropertyListItemFor,
  PropertyListKey,
  PropertyListPatchFor,
  PropertyListRootProps,
  PropertyListRootSlotProps
} from './types'

type PropertyListRootReactProps<K extends PropertyListKey> = PropertyListRootProps<K> & {
  children?: ReactNode | ((props: PropertyListRootSlotProps<K>) => ReactNode)
  onAdd?: (item: PropertyListItemFor<K>) => void
  onRemove?: (index: number) => void
  onUpdate?: (index: number, item: PropertyListItemFor<K>) => void
  onPatch?: (index: number, changes: PropertyListPatchFor<K>) => void
  onToggleVisibility?: (index: number) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
}

export function PropertyListRoot<K extends PropertyListKey>({
  propKey,
  items,
  mixed = false,
  disabled = false,
  getKey,
  children,
  onAdd,
  onRemove,
  onUpdate,
  onPatch,
  onToggleVisibility,
  onReorder
}: PropertyListRootReactProps<K>) {
  function keyOf(item: PropertyListItemFor<K>, index: number): PropertyListIdentity {
    return getKey?.(item, index) ?? index
  }

  const actions: PropertyListActions<K> = {
    add: (item) => { if (!disabled) onAdd?.(item) },
    remove: (index) => { if (!disabled) onRemove?.(index) },
    update: (index, item) => { if (!disabled) onUpdate?.(index, item) },
    patch: (index, changes) => { if (!disabled) onPatch?.(index, changes) },
    toggleVisibility: (index) => { if (!disabled) onToggleVisibility?.(index) },
    reorder: (fromIndex, toIndex) => { if (!disabled) onReorder?.(fromIndex, toIndex) }
  }

  const ctx: PropertyListContext<K> = {
    propKey,
    items,
    isMixed: mixed,
    disabled,
    keyOf,
    actions
  }

  const slotProps: PropertyListRootSlotProps<K> = {
    items,
    isMixed: mixed,
    disabled,
    keyOf,
    actions
  }

  return (
    <PropertyListProvider value={ctx as PropertyListContext}>
      {typeof children === 'function' ? children(slotProps) : children}
    </PropertyListProvider>
  )
}
