import { twMerge } from 'tailwind-merge'
import type { ReactNode } from 'react'

export interface AppBadgeProps {
  ui?: { base?: string }
  children?: ReactNode
}

export function AppBadge({ ui, children }: AppBadgeProps) {
  return (
    <span className={twMerge('shrink-0 rounded bg-accent/10 px-1 py-px text-[9px] text-accent', ui?.base)}>
      {children}
    </span>
  )
}
