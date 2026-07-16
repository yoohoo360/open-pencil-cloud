import * as Tooltip from '@radix-ui/react-tooltip'

import type { ReactElement, ReactNode } from 'react'

const contentClass =
  'z-50 animate-in zoom-in-95 fade-in rounded-md border border-border bg-panel px-2 py-1 text-xs text-surface shadow-lg'

export function Tip({
  label,
  side = 'top',
  children
}: {
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactElement
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={4} className={contentClass}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function TipProvider({ children }: { children: ReactNode }) {
  return <Tooltip.Provider delayDuration={400}>{children}</Tooltip.Provider>
}
