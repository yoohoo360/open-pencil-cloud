import type { ElementType, ReactNode } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { Slot } from '@radix-ui/react-slot'

import { usePropertySection } from '#react/primitives/PropertySection/context'
import type { PropertySectionSlotProps } from '#react/primitives/PropertySection/types'

interface PropertySectionContentProps {
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function PropertySectionContent({
  asChild = false,
  children,
  ...attrs
}: PropertySectionContentProps) {
  const ctx = usePropertySection()
  const content = typeof children === 'function' ? children(ctx.slotProps) : children
  if (asChild) {
    return (
      <Collapsible.Content asChild {...attrs} {...ctx.stateAttrs} data-slot="content">
        <Slot>{content}</Slot>
      </Collapsible.Content>
    )
  }
  return (
    <Collapsible.Content {...attrs} {...ctx.stateAttrs} data-slot="content">
      {content}
    </Collapsible.Content>
  )
}
