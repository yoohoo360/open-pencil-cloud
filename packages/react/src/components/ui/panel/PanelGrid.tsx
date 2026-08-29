import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'

import theme from '#react/theme/panel/grid'

export function PanelGrid({
  columns = 1,
  distribution = 'equal',
  className,
  actions,
  children
}: {
  columns?: 1 | 2 | 3
  distribution?: 'equal' | 'wide-first'
  className?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  const panelGrid = tv(theme)
  return (
    <div className={panelGrid({ columns, distribution, class: className })}>
      <div data-slot="fields">{children}</div>
      {actions ? <div data-slot="actions">{actions}</div> : null}
    </div>
  )
}
