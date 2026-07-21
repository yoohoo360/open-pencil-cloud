import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, useMemo, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import type * as React from 'react'

import type { PropertyListKey, PropertyListPartProps } from './types'

export type PropertyListVisibilityProps<K extends PropertyListKey> = PropertyListPartProps<K> &
  ComponentPropsWithoutRef<'button'> & {
    index: number
    children?: ReactNode | ((props: { visible: boolean }) => ReactNode)
    onToggle?: (index: number) => void
  }

export const PropertyListVisibility = memo(function PropertyListVisibility<
  K extends PropertyListKey
>({
  propKey,
  index,
  as: As = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onClick,
  onToggle,
  children,
  ...props
}: PropertyListVisibilityProps<K>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled
  const visible = context.items[index]?.visible !== false
  const content = typeof children === 'function' ? children({ visible }) : children
  const attributes = useMemo(
    () => ({
      ...props,
      type: !asChild && As === 'button' ? ('button' as const) : undefined,
      disabled,
      'aria-pressed': visible,
      'data-hidden': visible ? undefined : '',
      'data-slot': 'visibility',
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) {
          onToggle?.(index)
          context.actions.toggleVisibility(index)
        }
      }
    }),
    [As, asChild, context.actions, disabled, index, onClick, onToggle, props, visible]
  )
  return asChild ? <Slot {...attributes}>{content}</Slot> : createElement(As, attributes, content)
}) as <K extends PropertyListKey>(props: PropertyListVisibilityProps<K>) => ReactNode
