import type { ElementType, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertySection } from '#react/primitives/PropertySection/context'
import type { PropertySectionSlotProps } from '#react/primitives/PropertySection/types'

interface PropertySectionEmptyActionProps {
  as?: ElementType
  asChild?: boolean
  onActivate?: () => void
  children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function PropertySectionEmptyAction({
  as: Tag = 'button',
  asChild = false,
  onActivate,
  children,
  ...attrs
}: PropertySectionEmptyActionProps) {
  const ctx = usePropertySection()
  if (!ctx.empty) return null

  const content = typeof children === 'function' ? children(ctx.slotProps) : children

  function activate() {
    if (ctx.disabled) return
    ctx.actions.open()
    onActivate?.()
  }

  const Comp = asChild ? Slot : (Tag as 'button')
  return (
    <Comp
      {...attrs}
      {...ctx.stateAttrs}
      type={!asChild && Tag === 'button' ? 'button' : undefined}
      data-slot="empty-action"
      onClick={activate}
    >
      {content}
    </Comp>
  )
}
