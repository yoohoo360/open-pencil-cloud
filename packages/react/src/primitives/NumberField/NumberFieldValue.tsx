import { useNumberField } from '#react/primitives/NumberField/context'
import type { NumberFieldSlotProps } from '#react/primitives/NumberField/types'
import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'

export type NumberFieldValueProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children?: ReactNode | ((props: NumberFieldSlotProps & { value: string }) => ReactNode)
}

export const NumberFieldValue = memo(function NumberFieldValue({
  children,
  ...props
}: NumberFieldValueProps) {
  const context = useNumberField()
  const slotProps = useMemo(
    () => ({ ...context.slotProps, value: context.displayValue }),
    [context.displayValue, context.slotProps]
  )
  if (context.editing) return null
  return (
    <span {...props} {...context.stateAttrs} data-slot="value">
      {typeof children === 'function'
        ? children(slotProps)
        : (children ?? (context.isMixed ? context.slotProps.placeholder : context.displayValue))}
    </span>
  )
})

NumberFieldValue.displayName = 'NumberFieldValue'
