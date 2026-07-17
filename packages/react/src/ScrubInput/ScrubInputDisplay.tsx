import { type ComponentPropsWithoutRef, type ReactNode } from 'react'

import { useScrubInput } from './context'

export interface ScrubInputDisplayProps extends ComponentPropsWithoutRef<'span'> {
  children?: (props: { value: string; isMixed: boolean; placeholder: string }) => ReactNode
}

export function ScrubInputDisplay({ children, ...rest }: ScrubInputDisplayProps) {
  const ctx = useScrubInput()

  if (ctx.editing) return null

  if (children) {
    return (
      <span {...rest}>
        {children({ value: ctx.displayValue, isMixed: ctx.isMixed, placeholder: '' })}
      </span>
    )
  }

  return <span {...rest}>{ctx.isMixed ? '' : ctx.displayValue}</span>
}

export default ScrubInputDisplay
