import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { useBindableValue } from '#react/primitives/BindableValue/context'
import type { BindableValueSlotProps } from '#react/primitives/BindableValue/types'

interface BindableValueTriggerProps {
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: BindableValueSlotProps) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function BindableValueTrigger({
  as: Tag = 'button',
  asChild = false,
  children,
  ...attrs
}: BindableValueTriggerProps) {
  const ctx = useBindableValue()
  const content = typeof children === 'function' ? children(ctx.slotProps) : children

  const semanticAttrs = {
    type: !asChild && Tag === 'button' ? ('button' as const) : undefined,
    'aria-expanded': ctx.open,
    'aria-haspopup': 'listbox' as const
  }

  const Comp = asChild ? Slot : (Tag as 'button')
  return (
    <Comp
      {...attrs}
      {...ctx.stateAttrs}
      {...semanticAttrs}
      data-slot="trigger"
      onClick={() => ctx.actions.togglePicker()}
    >
      {content}
    </Comp>
  )
}
