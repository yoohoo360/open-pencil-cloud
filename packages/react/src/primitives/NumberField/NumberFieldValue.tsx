import type { ReactNode } from 'react'
import { useNumberField } from '#react/primitives/NumberField/context'
import type { NumberFieldSlotProps } from '#react/primitives/NumberField/types'

interface NumberFieldValueProps {
  children?: ReactNode | ((props: NumberFieldSlotProps & { value: string }) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function NumberFieldValue({ children, ...attrs }: NumberFieldValueProps) {
  const ctx = useNumberField()
  if (ctx.editing) return null

  const slotPropsWithValue = { ...ctx.slotProps, value: ctx.displayValue }
  const content =
    typeof children === 'function'
      ? children(slotPropsWithValue)
      : (children ?? (ctx.isMixed ? ctx.slotProps.placeholder : ctx.displayValue))

  return (
    <span {...attrs} {...ctx.stateAttrs} data-slot="value">
      {content}
    </span>
  )
}
