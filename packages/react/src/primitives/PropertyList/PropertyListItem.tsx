import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, useMemo, type ElementType, type ReactNode } from 'react'

import type {
  PropertyListItemFor,
  PropertyListItemSlotProps,
  PropertyListKey,
  PropertyListPatchFor
} from './types'

export type PropertyListItemProps<K extends PropertyListKey> = {
  propKey: K
  index: number
  dragging?: boolean
  disabled?: boolean
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: PropertyListItemSlotProps<K>) => ReactNode)
  onUpdate?: (index: number, item: PropertyListItemFor<K>) => void
  onPatch?: (index: number, changes: PropertyListPatchFor<K>) => void
  onRemove?: (index: number) => void
  onToggleVisibility?: (index: number) => void
}

export const PropertyListItem = memo(function PropertyListItem<K extends PropertyListKey>({
  propKey,
  index,
  dragging = false,
  disabled: disabledProp = false,
  as: As = 'div',
  asChild = false,
  children,
  onUpdate,
  onPatch,
  onRemove,
  onToggleVisibility,
  ...props
}: PropertyListItemProps<K>) {
  const context = usePropertyListPart(propKey)
  const item = context.items[index]
  const hidden = item?.visible === false
  const disabled = disabledProp || context.disabled
  const slotProps = useMemo<PropertyListItemSlotProps<K>>(
    () => ({
      item,
      index,
      hidden,
      dragging,
      disabled,
      actions: {
        update: (next) => {
          if (!disabled) {
            onUpdate?.(index, next)
            context.actions.update(index, next)
          }
        },
        patch: (changes) => {
          if (!disabled) {
            onPatch?.(index, changes)
            context.actions.patch(index, changes)
          }
        },
        remove: () => {
          if (!disabled) {
            onRemove?.(index)
            context.actions.remove(index)
          }
        },
        toggleVisibility: () => {
          if (!disabled) {
            onToggleVisibility?.(index)
            context.actions.toggleVisibility(index)
          }
        }
      }
    }),
    [
      context.actions,
      disabled,
      dragging,
      hidden,
      index,
      item,
      onPatch,
      onRemove,
      onToggleVisibility,
      onUpdate
    ]
  )
  const attributes = {
    ...props,
    'data-hidden': hidden ? '' : undefined,
    'data-dragging': dragging ? '' : undefined,
    'data-disabled': disabled ? '' : undefined,
    'data-slot': 'item'
  }
  const content = typeof children === 'function' ? children(slotProps) : children
  return asChild ? <Slot {...attributes}>{content}</Slot> : createElement(As, attributes, content)
}) as <K extends PropertyListKey>(props: PropertyListItemProps<K>) => ReactNode
