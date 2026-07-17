import { type ReactNode } from 'react'

import { usePropertyList } from './context'

export interface PropertyListItemProps {
  index: number
  onUpdate?: (index: number, item: unknown) => void
  onPatch?: (index: number, changes: Record<string, unknown>) => void
  onRemove?: (index: number) => void
  onToggleVisibility?: (index: number) => void
  children: (ctx: {
    index: number
    update: (item: unknown) => void
    patch: (changes: Record<string, unknown>) => void
    remove: () => void
    toggleVisibility: () => void
  }) => ReactNode
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

  return (
    <>
      {children({
        index,
        update: (item: unknown) => {
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
      })}
    </>
  )
}

export default PropertyListItem
