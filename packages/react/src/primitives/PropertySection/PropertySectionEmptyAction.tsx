import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

import { usePropertySection } from '#react/primitives/PropertySection/context'
import type { PropertySectionPartProps, PropertySectionSlotProps } from '#react/primitives/PropertySection/types'

export type PropertySectionEmptyActionProps = PropertySectionPartProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
    onActivate?: () => void
  }

export const PropertySectionEmptyAction = memo(function PropertySectionEmptyAction({
  as: As = 'button',
  asChild = false,
  children,
  onActivate,
  onClick,
  ...props
}: PropertySectionEmptyActionProps) {
  const context = usePropertySection()
  if (!context.empty) return null
  const content = typeof children === 'function' ? children(context.slotProps) : children
  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || context.disabled) return
    context.actions.open()
    onActivate?.()
  }
  const attributes = { ...props, ...context.stateAttrs, 'data-slot': 'empty-action', onClick: activate }

  return asChild ? (
    <Slot {...attributes}>{content}</Slot>
  ) : (
    createElement(As, { ...attributes, type: As === 'button' ? 'button' : undefined, disabled: context.disabled }, content)
  )
})

PropertySectionEmptyAction.displayName = 'PropertySectionEmptyAction'
