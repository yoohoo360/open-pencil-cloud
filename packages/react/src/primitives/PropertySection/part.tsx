import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, type HTMLAttributes, type ReactNode } from 'react'

import { usePropertySection } from '#react/primitives/PropertySection/context'
import type { PropertySectionPartProps, PropertySectionSlotProps } from '#react/primitives/PropertySection/types'

export type PropertySectionPartComponentProps = PropertySectionPartProps &
  Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
    slot: string
  }

export const PropertySectionPart = memo(function PropertySectionPart({
  as: As = 'div',
  asChild = false,
  children,
  slot,
  ...props
}: PropertySectionPartComponentProps) {
  const context = usePropertySection()
  const content = typeof children === 'function' ? children(context.slotProps) : children
  const attributes = { ...props, ...context.stateAttrs, 'data-slot': slot }

  return asChild ? <Slot {...attributes}>{content}</Slot> : createElement(As, attributes, content)
})

PropertySectionPart.displayName = 'PropertySectionPart'
