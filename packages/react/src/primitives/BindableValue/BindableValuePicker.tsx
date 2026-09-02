import type { ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'

import { useBindableValue } from '#react/primitives/BindableValue/context'
import type { BindableValueSlotProps } from '#react/primitives/BindableValue/types'

interface BindableValuePickerProps {
  children?: ReactNode | ((props: BindableValueSlotProps) => ReactNode)
}

export function BindableValuePicker({ children }: BindableValuePickerProps) {
  const ctx = useBindableValue()

  const content = typeof children === 'function' ? children(ctx.slotProps) : children

  return (
    <Popover.Root
      open={ctx.open}
      onOpenChange={(open) => (open ? ctx.actions.openPicker() : ctx.actions.closePicker())}
    >
      {content}
    </Popover.Root>
  )
}
