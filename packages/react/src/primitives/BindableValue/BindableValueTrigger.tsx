import { useBindableValue } from '#react/primitives/BindableValue/context'
import type {
  BindableValueSlotProps,
  BindableValueTriggerProps
} from '#react/primitives/BindableValue/types'
import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, useMemo, type ReactNode } from 'react'
import type * as React from 'react'

export type BindableValueTriggerComponentProps = BindableValueTriggerProps & {
  children?: ReactNode | ((props: BindableValueSlotProps) => ReactNode)
}

export const BindableValueTrigger = memo(function BindableValueTrigger({
  as: As = 'button',
  asChild = false,
  children,
  onClick,
  ...props
}: BindableValueTriggerComponentProps) {
  const context = useBindableValue()
  const attributes = useMemo(
    () => ({
      ...props,
      ...context.stateAttrs,
      type: !asChild && As === 'button' ? ('button' as const) : undefined,
      'aria-expanded': context.open,
      'aria-haspopup': 'listbox' as const,
      'data-slot': 'trigger',
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented) context.actions.togglePicker()
      }
    }),
    [As, asChild, context, onClick, props]
  )
  const content = typeof children === 'function' ? children(context.slotProps) : children
  return asChild ? <Slot {...attributes}>{content}</Slot> : createElement(As, attributes, content)
})

BindableValueTrigger.displayName = 'BindableValueTrigger'
