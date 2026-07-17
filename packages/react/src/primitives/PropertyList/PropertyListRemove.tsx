import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import type { PropertyListKey } from './types'

interface PropertyListRemoveProps<K extends PropertyListKey> {
  propKey: K
  index: number
  as?: ElementType
  asChild?: boolean
  disabled?: boolean
  onRemove?: (index: number) => void
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

export function PropertyListRemove<K extends PropertyListKey>({
  propKey,
  index,
  as: Tag = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onRemove,
  children,
  ...attrs
}: PropertyListRemoveProps<K>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled

  function remove() {
    if (disabled) return
    onRemove?.(index)
    context.actions.remove(index)
  }

  const Comp = asChild ? Slot : (Tag as 'button')
  return (
    <Comp
      {...attrs}
      type={!asChild && Tag === 'button' ? 'button' : undefined}
      disabled={disabled}
      data-slot="remove"
      onClick={remove}
    >
      {children}
    </Comp>
  )
}
