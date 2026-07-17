import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import type {
  PropertyListItemActions,
  PropertyListItemFor,
  PropertyListItemSlotProps,
  PropertyListKey,
  PropertyListPatchFor
} from './types'

interface PropertyListItemProps<K extends PropertyListKey> {
  propKey: K
  index: number
  dragging?: boolean
  disabled?: boolean
  as?: ElementType
  asChild?: boolean
  onUpdate?: (index: number, item: PropertyListItemFor<K>) => void
  onPatch?: (index: number, changes: PropertyListPatchFor<K>) => void
  onRemove?: (index: number) => void
  onToggleVisibility?: (index: number) => void
  children?: ReactNode | ((props: PropertyListItemSlotProps<K>) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function PropertyListItem<K extends PropertyListKey>({
  propKey,
  index,
  dragging = false,
  disabled: disabledProp = false,
  as: Tag = 'div',
  asChild = false,
  onUpdate,
  onPatch,
  onRemove,
  onToggleVisibility,
  children,
  ...attrs
}: PropertyListItemProps<K>) {
  const context = usePropertyListPart(propKey)
  const item = context.items[index] as PropertyListItemFor<K> | undefined
  const hidden = item?.visible === false
  const disabled = disabledProp || context.disabled

  const actions: PropertyListItemActions<K> = {
    update: (nextItem) => {
      if (disabled) return
      onUpdate?.(index, nextItem)
      context.actions.update(index, nextItem)
    },
    patch: (changes) => {
      if (disabled) return
      onPatch?.(index, changes)
      context.actions.patch(index, changes)
    },
    remove: () => {
      if (disabled) return
      onRemove?.(index)
      context.actions.remove(index)
    },
    toggleVisibility: () => {
      if (disabled) return
      onToggleVisibility?.(index)
      context.actions.toggleVisibility(index)
    }
  }

  const slotProps: PropertyListItemSlotProps<K> = { item, index, hidden, dragging, disabled, actions }
  const content = typeof children === 'function' ? children(slotProps) : children

  const Comp = asChild ? Slot : (Tag as 'div')
  return (
    <Comp
      {...attrs}
      data-hidden={hidden ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-slot="item"
    >
      {content}
    </Comp>
  )
}
