import * as RovingFocus from '@radix-ui/react-roving-focus'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Slot } from '@radix-ui/react-slot'
import {
  createElement,
  memo,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode
} from 'react'

import { useSegmentedControl } from '#react/primitives/SegmentedControl/context'
import type {
  SegmentedControlItemProps,
  SegmentedControlItemSlotProps
} from '#react/primitives/SegmentedControl/types'

export type SegmentedControlItemComponentProps = SegmentedControlItemProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'value'> & {
    children?: ReactNode | ((props: SegmentedControlItemSlotProps) => ReactNode)
    onClick?: (event: MouseEvent<HTMLElement>) => void
  }

export const SegmentedControlItem = memo(function SegmentedControlItem({
  value,
  disabled: disabledProp = false,
  as: As = 'button',
  asChild = false,
  children,
  onClick,
  ...props
}: SegmentedControlItemComponentProps) {
  const context = useSegmentedControl()
  const disabled = disabledProp || context.disabled
  const selected = context.selected(value)
  const slotProps = { value, selected, disabled, mode: context.mode }
  const content = typeof children === 'function' ? children(slotProps) : children

  if (context.mode !== 'action') {
    return (
      <ToggleGroup.Item
        {...props}
        value={value}
        disabled={disabled}
        asChild={asChild}
        data-slot="item"
      >
        {asChild ? content : createElement(As, undefined, content)}
      </ToggleGroup.Item>
    )
  }

  const item = asChild ? (
    <Slot
      {...props}
      data-slot="item"
      data-state="off"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) context.activate(value)
      }}
    >
      {content}
    </Slot>
  ) : (
    createElement(
      As,
      {
        ...props,
        type: As === 'button' ? 'button' : undefined,
        disabled,
        'data-slot': 'item',
        'data-state': 'off',
        onClick: (event: MouseEvent<HTMLElement>) => {
          onClick?.(event)
          if (!event.defaultPrevented && !disabled) context.activate(value)
        }
      },
      content
    )
  )

  return <RovingFocus.Item asChild focusable={!disabled}>{item}</RovingFocus.Item>
})

SegmentedControlItem.displayName = 'SegmentedControlItem'
