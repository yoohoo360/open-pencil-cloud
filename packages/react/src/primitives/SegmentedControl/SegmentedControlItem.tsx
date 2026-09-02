import type { ElementType, ReactNode } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Slot } from '@radix-ui/react-slot'

import { useSegmentedControl } from '#react/primitives/SegmentedControl/context'
import type { SegmentedControlItemSlotProps } from '#react/primitives/SegmentedControl/types'

interface SegmentedControlItemProps {
  value: string
  disabled?: boolean
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: SegmentedControlItemSlotProps) => ReactNode)
  [key: string]: unknown
}

export function SegmentedControlItem({
  value,
  disabled: disabledProp = false,
  asChild = false,
  children,
  ...attrs
}: SegmentedControlItemProps) {
  const ctx = useSegmentedControl()
  const disabled = disabledProp || ctx.disabled
  const selected = ctx.selected(value)
  const slotProps: SegmentedControlItemSlotProps = { value, selected, disabled, mode: ctx.mode }
  const content = typeof children === 'function' ? children(slotProps) : children

  if (ctx.mode !== 'action') {
    return (
      <ToggleGroup.Item
        {...attrs}
        value={value}
        disabled={disabled}
        data-slot="item"
      >
        {content}
      </ToggleGroup.Item>
    )
  }

  // action mode — plain button with roving focus handled via tabIndex
  if (asChild) {
    return (
      <Slot
        {...attrs}
        data-slot="item"
        data-state="off"
        aria-disabled={disabled ? true : undefined}
        onClick={() => { if (!disabled) ctx.activate(value) }}
      >
        {content}
      </Slot>
    )
  }

  return (
    <button
      {...attrs}
      type="button"
      disabled={disabled}
      data-slot="item"
      data-state="off"
      onClick={() => { if (!disabled) ctx.activate(value) }}
    >
      {content}
    </button>
  )
}
