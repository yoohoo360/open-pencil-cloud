import type { ReactNode } from 'react'

import { usePropertyList, type ArrayItemType } from './context'

export interface PropertyListItemSlotProps {
  index: number
  update: (item: ArrayItemType) => void
  patch: (changes: Record<string, unknown>) => void
  remove: () => void
  toggleVisibility: () => void
}

export interface PropertyListItemProps {
  index: number
  onUpdate?: (index: number, item: ArrayItemType) => void
  onPatch?: (index: number, changes: Record<string, unknown>) => void
  onRemove?: (index: number) => void
  onToggleVisibility?: (index: number) => void
  children?: ReactNode | ((state: PropertyListItemSlotProps) => ReactNode)
}

export function PropertyListItem({
  index,
  onUpdate,
  onPatch,
  onRemove,
  onToggleVisibility,
  children
}: PropertyListItemProps) {
  const { update, patch, remove, toggleVisibility } = usePropertyList()

  const slot: PropertyListItemSlotProps = {
    index,
    update: (item: ArrayItemType) => {
      onUpdate?.(index, item)
      update(index, item)
    },
    patch: (changes: Record<string, unknown>) => {
      onPatch?.(index, changes)
      patch(index, changes)
    },
    remove: () => {
      onRemove?.(index)
      remove(index)
    },
    toggleVisibility: () => {
      onToggleVisibility?.(index)
      toggleVisibility(index)
    }
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
