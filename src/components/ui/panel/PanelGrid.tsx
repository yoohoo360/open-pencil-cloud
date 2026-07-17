import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'
import type { ClassValue } from 'tailwind-variants'

import type { PanelGridTheme } from '@/theme/panel/grid'
import theme from '@/theme/panel/grid'

type PanelGridColumns = keyof PanelGridTheme['variants']['columns']

export interface PanelGridProps {
  columns?: PanelGridColumns
  className?: ClassValue
  children?: ReactNode
}

export function PanelGrid({ columns = 'two-rail', className, children }: PanelGridProps) {
  const panelGrid = tv(theme)
  return (
    <div
      data-slot="root"
      data-panel-grid
      data-columns={columns}
      className={panelGrid({ columns, class: className })}
    >
      {children}
    </div>
  )
}
