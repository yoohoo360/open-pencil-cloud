import { useNumberField } from '#react/primitives/NumberField/context'
import { createElement, memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'

export type NumberFieldPartName = 'leading' | 'unit' | 'trailing' | 'menu'

function createNumberFieldPart(part: NumberFieldPartName) {
  return memo(function NumberFieldPart({
    children,
    ...props
  }: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    children?: ReactNode | ((props: ReturnType<typeof useNumberField>['slotProps']) => ReactNode)
  }) {
    const context = useNumberField()
    const content = useMemo(
      () => (typeof children === 'function' ? children(context.slotProps) : children),
      [children, context.slotProps]
    )
    return createElement('span', { ...props, ...context.stateAttrs, 'data-slot': part }, content)
  })
}

export const NumberFieldLeading = createNumberFieldPart('leading')
export const NumberFieldUnit = createNumberFieldPart('unit')
export const NumberFieldTrailing = createNumberFieldPart('trailing')
export const NumberFieldMenu = createNumberFieldPart('menu')
