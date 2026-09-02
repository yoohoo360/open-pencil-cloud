import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'
import type { ClassValue } from 'tailwind-variants'
import type { PanelRowTheme } from '@/theme/panel/row'

import theme from '@/theme/panel/row'

export interface PanelRowProps {
  cols?: keyof PanelRowTheme['variants']['columns']
  gap?: keyof PanelRowTheme['variants']['gap']
  className?: ClassValue
  children?: ReactNode
}

/** @deprecated Prefer PanelGrid for new property-panel layouts. */
export function PanelRow({ cols = 'auto', gap = 'md', className, children }: PanelRowProps) {
  const panelRow = tv(theme)
  return <div className={panelRow({ columns: cols, gap, class: className })}>{children}</div>
}
