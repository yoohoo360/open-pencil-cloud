import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'

import type { PanelGridTheme } from '@/theme/panel/grid'
import theme from '@/theme/panel/grid'

type PanelGridColumns = keyof PanelGridTheme['variants']['columns']

export type PanelGridProps = {
  children: ReactNode
  className?: ClassValue
  columns?: PanelGridColumns
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export const PanelGrid = memo(function PanelGrid({
  children,
  className,
  columns = 'two-rail',
  ...props
}: PanelGridProps) {
  const classes = useMemo(() => tv(theme)({ columns, class: className }), [className, columns])

  return (
    <div {...props} className={classes} data-columns={columns} data-panel-grid data-slot="root">
      {children}
    </div>
  )
})

PanelGrid.displayName = 'PanelGrid'

export default PanelGrid
