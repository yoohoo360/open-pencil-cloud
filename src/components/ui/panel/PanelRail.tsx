import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'

import theme from '@/theme/panel/rail'

export type PanelRailProps = {
  children: ReactNode
  className?: ClassValue
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export const PanelRail = memo(function PanelRail({ children, className, ...props }: PanelRailProps) {
  const classes = useMemo(() => tv(theme)({ class: className }), [className])

  return (
    <div {...props} className={classes} data-panel-rail data-slot="root">
      {children}
    </div>
  )
})

PanelRail.displayName = 'PanelRail'

export default PanelRail
