import { type ReactNode } from 'react'
import { useNumberField } from '#react/primitives/NumberField/context'

export type NumberFieldPartName = 'leading' | 'unit' | 'trailing' | 'menu'

interface NumberFieldPartProps {
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

function createNumberFieldPart(part: NumberFieldPartName) {
  const label = `NumberField${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`

  function NumberFieldPart({ children, ...props }: NumberFieldPartProps) {
    const ctx = useNumberField()
    return (
      <span {...props} {...ctx.stateAttrs} data-slot={part}>
        {children}
      </span>
    )
  }
  NumberFieldPart.displayName = label
  return NumberFieldPart
}

export const NumberFieldLeading = createNumberFieldPart('leading')
export const NumberFieldUnit = createNumberFieldPart('unit')
export const NumberFieldTrailing = createNumberFieldPart('trailing')
export const NumberFieldMenu = createNumberFieldPart('menu')
