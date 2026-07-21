import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, useMemo, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import type * as React from 'react'

import type { PropertyListKey, PropertyListPartProps } from './types'

export type PropertyListRemoveProps<K extends PropertyListKey> = PropertyListPartProps<K> &
  ComponentPropsWithoutRef<'button'> & {
    index: number
    children?: ReactNode
    onRemove?: (index: number) => void
  }

export const PropertyListRemove = memo(function PropertyListRemove<K extends PropertyListKey>({
  propKey,
  index,
  as: As = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onClick,
  onRemove,
  children,
  ...props
}: PropertyListRemoveProps<K>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled
  const attributes = useMemo(
    () => ({
      ...props,
      type: !asChild && As === 'button' ? ('button' as const) : undefined,
      disabled,
      'data-slot': 'remove',
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) {
          onRemove?.(index)
          context.actions.remove(index)
        }
      }
    }),
    [As, asChild, context.actions, disabled, index, onClick, onRemove, props]
  )
  return asChild ? <Slot {...attributes}>{children}</Slot> : createElement(As, attributes, children)
}) as <K extends PropertyListKey>(props: PropertyListRemoveProps<K>) => ReactNode
