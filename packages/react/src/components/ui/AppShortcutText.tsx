import { twMerge } from 'tailwind-merge'
import type { ReactNode } from 'react'

export function AppShortcutText({
  ui,
  children
}: {
  ui?: { base?: string }
  children?: ReactNode
}) {
  return <span className={twMerge('text-[11px] text-muted', ui?.base)}>{children}</span>
}
