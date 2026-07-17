import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertySection } from '#react/primitives/PropertySection/context'

interface PropertySectionHeaderProps {
  as?: ElementType
  asChild?: boolean
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

export function PropertySectionHeader({
  as: Tag = 'div',
  asChild = false,
  children,
  ...attrs
}: PropertySectionHeaderProps) {
  const ctx = usePropertySection()
  const Comp = asChild ? Slot : (Tag as 'div')
  return (
    <Comp {...attrs} {...ctx.stateAttrs} data-slot="header">
      {children}
    </Comp>
  )
}
