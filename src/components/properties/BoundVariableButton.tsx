import type { ButtonHTMLAttributes } from 'react'

import IconDiamondMinus from '~icons/lucide/diamond-minus'

import { Tip } from '@/components/ui/Tip'

interface BoundVariableButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  onDetach?: () => void
}

export function BoundVariableButton({ label, onDetach, ...attrs }: BoundVariableButtonProps) {
  return (
    <Tip label={label}>
      <button
        {...attrs}
        aria-label={label}
        className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-violet-400 hover:text-surface"
        onClick={onDetach}
      >
        <IconDiamondMinus className="size-3.5" />
      </button>
    </Tip>
  )
}
