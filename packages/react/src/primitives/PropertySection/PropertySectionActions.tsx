import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertySection } from '#react/primitives/PropertySection/context'
import type { PropertySectionSlotProps } from '#react/primitives/PropertySection/types'

interface PropertySectionActionsProps {
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function PropertySectionActions({
  as: Tag = 'div',
  asChild = false,
  children,
  ...attrs
}: PropertySectionActionsProps) {
  const ctx = usePropertySection()
  const content = typeof children === 'function' ? children(ctx.slotProps) : children
  const Comp = asChild ? Slot : (Tag as 'div')
  return (
    <Comp {...attrs} {...ctx.stateAttrs} data-slot="actions">
      {content}
    </Comp>
  )
}
