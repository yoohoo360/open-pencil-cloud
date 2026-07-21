import { PropertyListProvider } from '#react/primitives/PropertyList/context'
import type {
  PropertyListActions,
  PropertyListIdentity,
  PropertyListItemFor,
  PropertyListKey,
  PropertyListPatchFor,
  PropertyListRootProps,
  PropertyListRootSlotProps
} from '#react/primitives/PropertyList/types'
import { memo, useCallback, useMemo, type ReactNode } from 'react'

export type PropertyListRootComponentProps<K extends PropertyListKey> = PropertyListRootProps<K> & {
  children?: ReactNode | ((props: PropertyListRootSlotProps<K>) => ReactNode)
  onAdd?: (item: PropertyListItemFor<K>) => void
  onRemove?: (index: number) => void
  onUpdate?: (index: number, item: PropertyListItemFor<K>) => void
  onPatch?: (index: number, changes: PropertyListPatchFor<K>) => void
  onToggleVisibility?: (index: number) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
}

export const PropertyListRoot = memo(function PropertyListRoot<K extends PropertyListKey>({
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
}: PropertyListRootComponentProps<K>) {
  const keyOf = useCallback(
    (item: PropertyListItemFor<K>, index: number): PropertyListIdentity =>
      getKey?.(item, index) ?? index,
    [getKey]
  )
  const actions = useMemo<PropertyListActions<K>>(
    () => ({
      add: (item) => {
        if (!disabled) onAdd?.(item)
      },
      remove: (index) => {
        if (!disabled) onRemove?.(index)
      },
      update: (index, item) => {
        if (!disabled) onUpdate?.(index, item)
      },
      patch: (index, changes) => {
        if (!disabled) onPatch?.(index, changes)
      },
      toggleVisibility: (index) => {
        if (!disabled) onToggleVisibility?.(index)
      },
      reorder: (fromIndex, toIndex) => {
        if (!disabled) onReorder?.(fromIndex, toIndex)
      }
    }),
    [disabled, onAdd, onPatch, onRemove, onReorder, onToggleVisibility, onUpdate]
  )
  const context = useMemo(
    () => ({ propKey, items, isMixed: mixed, disabled, keyOf, actions }),
    [actions, disabled, items, keyOf, mixed, propKey]
  )
  const slotProps = useMemo(
    () => ({ items, isMixed: mixed, disabled, keyOf, actions }),
    [actions, disabled, items, keyOf, mixed]
  )
  return (
    <PropertyListProvider value={context}>
      {typeof children === 'function' ? children(slotProps) : children}
    </PropertyListProvider>
  )
}) as <K extends PropertyListKey>(props: PropertyListRootComponentProps<K>) => ReactNode
