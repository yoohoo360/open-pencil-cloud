import { usePropertyListPart } from '#react/primitives/PropertyList/context'
import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, useMemo, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import type * as React from 'react'

import type { PropertyListItemFor, PropertyListKey, PropertyListPartProps } from './types'

export type PropertyListAddProps<K extends PropertyListKey> = PropertyListPartProps<K> &
  ComponentPropsWithoutRef<'button'> & {
    item: PropertyListItemFor<K>
    children?: ReactNode
    onAdd?: (item: PropertyListItemFor<K>) => void
  }

export const PropertyListAdd = memo(function PropertyListAdd<K extends PropertyListKey>({
  propKey,
  item,
  as: As = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onClick,
  onAdd,
  children,
  ...props
}: PropertyListAddProps<K>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled
  const attributes = useMemo(
    () => ({
      ...props,
      type: !asChild && As === 'button' ? ('button' as const) : undefined,
      disabled,
      'data-slot': 'add',
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) {
          onAdd?.(item)
          context.actions.add(item)
        }
      }
    }),
    [As, asChild, disabled, item, onAdd, onClick, props, context.actions]
  )
  return asChild ? <Slot {...attributes}>{children}</Slot> : createElement(As, attributes, children)
}) as <K extends PropertyListKey>(props: PropertyListAddProps<K>) => ReactNode
