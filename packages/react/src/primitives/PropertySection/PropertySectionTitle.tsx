import type { ReactNode } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { Slot } from '@radix-ui/react-slot'

import { usePropertySection } from '#react/primitives/PropertySection/context'
import type { PropertySectionSlotProps } from '#react/primitives/PropertySection/types'

interface PropertySectionTitleProps {
  asChild?: boolean
  children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function PropertySectionTitle({
  asChild = false,
  children,
  ...attrs
}: PropertySectionTitleProps) {
  const ctx = usePropertySection()
  const content = typeof children === 'function' ? children(ctx.slotProps) : children
  if (asChild) {
    return (
      <Collapsible.Trigger asChild {...attrs} {...ctx.stateAttrs} data-slot="title">
        <Slot>{content}</Slot>
      </Collapsible.Trigger>
    )
  }
  return (
    <Collapsible.Trigger {...attrs} {...ctx.stateAttrs} data-slot="title">
      {content}
    </Collapsible.Trigger>
  )
}
