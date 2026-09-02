import { twMerge } from 'tailwind-merge'
import type { MouseEventHandler, ReactNode } from 'react'

export interface AppTextButtonProps {
  ui?: { base?: string }
  size?: 'xs' | 'sm'
  underline?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
  children?: ReactNode
}

export function AppTextButton({ ui, size = 'sm', underline = false, onClick, children }: AppTextButtonProps) {
  return (
    <button
      type="button"
      className={twMerge(
        'cursor-pointer text-muted hover:text-surface',
        size === 'xs' ? 'text-[9px]' : 'text-[10px]',
        underline && 'underline',
        ui?.base
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
