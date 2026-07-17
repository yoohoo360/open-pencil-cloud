import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import type { PropertyListKey } from './types'

interface PropertyListVisibilityProps<K extends PropertyListKey> {
  propKey: K
  index: number
  as?: ElementType
  asChild?: boolean
  disabled?: boolean
  onToggleVisibility?: (index: number) => void
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

export function PropertyListVisibility<K extends PropertyListKey>({
  propKey,
  index,
  as: Tag = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onToggleVisibility,
  children,
  ...attrs
}: PropertyListVisibilityProps<K>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled

  function toggle() {
    if (disabled) return
    onToggleVisibility?.(index)
    context.actions.toggleVisibility(index)
  }

  const Comp = asChild ? Slot : (Tag as 'button')
  return (
    <Comp
      {...attrs}
      type={!asChild && Tag === 'button' ? 'button' : undefined}
      disabled={disabled}
      data-slot="visibility"
      onClick={toggle}
    >
      {children}
    </Comp>
  )
}
