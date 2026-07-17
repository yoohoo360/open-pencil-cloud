import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'
import type { ClassValue } from 'tailwind-variants'

import theme from '@/theme/panel/rail'

export interface PanelRailProps {
  className?: ClassValue
  children?: ReactNode
}

export function PanelRail({ className, children }: PanelRailProps) {
  const panelRail = tv(theme)
  return (
    <div data-slot="root" data-panel-rail className={panelRail({ class: className })}>
      {children}
    </div>
  )
}
