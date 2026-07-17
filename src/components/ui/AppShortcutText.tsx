import { twMerge } from 'tailwind-merge'
import type { ReactNode } from 'react'

interface AppShortcutTextProps {
  ui?: { base?: string }
  children?: ReactNode
}

export function AppShortcutText({ ui, children }: AppShortcutTextProps) {
  return (
    <span className={twMerge('text-[11px] text-muted', ui?.base)}>
      {children}
    </span>
  )
}
