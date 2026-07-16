import type { HTMLAttributes, ReactNode } from 'react'

import { useScrubInput } from './context'

export interface ScrubInputDisplaySlotProps {
  value: string
  isMixed: boolean
  placeholder: string
}

export interface ScrubInputDisplayProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode | ((state: ScrubInputDisplaySlotProps) => ReactNode)
}

export function ScrubInputDisplay({ children, ...attrs }: ScrubInputDisplayProps) {
  const ctx = useScrubInput()
  if (ctx.editing) return null

  const slot: ScrubInputDisplaySlotProps = {
    value: ctx.displayValue,
    isMixed: ctx.isMixed,
    placeholder: ''
  }

  return (
    <span {...attrs}>
      {typeof children === 'function'
        ? children(slot)
        : (children ?? (ctx.isMixed ? '' : ctx.displayValue))}
    </span>
  )
}
