import { useBindableValue } from '#react/primitives/BindableValue/context'
import type { BindableValueSlotProps } from '#react/primitives/BindableValue/types'
import { memo, useMemo, type ReactNode } from 'react'

export type BindableValuePickerProps = {
  children?: ReactNode | ((props: BindableValueSlotProps) => ReactNode)
}

export const BindableValuePicker = memo(function BindableValuePicker({
  children
}: BindableValuePickerProps) {
  const context = useBindableValue()
  const content = useMemo(
    () => (typeof children === 'function' ? children(context.slotProps) : children),
    [children, context.slotProps]
  )
  if (!context.open) return null
  return <>{content}</>
})

BindableValuePicker.displayName = 'BindableValuePicker'
