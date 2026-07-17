import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import type { PropertyListItemFor, PropertyListKey } from './types'

interface PropertyListAddProps<K extends PropertyListKey> {
  propKey: K
  item: PropertyListItemFor<K>
  as?: ElementType
  asChild?: boolean
  disabled?: boolean
  onAdd?: (item: PropertyListItemFor<K>) => void
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

export function PropertyListAdd<K extends PropertyListKey>({
  propKey,
  item,
  as: Tag = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onAdd,
  children,
  ...attrs
}: PropertyListAddProps<K>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled

  function add() {
    if (disabled) return
    onAdd?.(item)
    context.actions.add(item)
  }

  const Comp = asChild ? Slot : (Tag as 'button')
  return (
    <Comp
      {...attrs}
      type={!asChild && Tag === 'button' ? 'button' : undefined}
      disabled={disabled}
      data-slot="add"
      onClick={add}
    >
      {children}
    </Comp>
  )
}
