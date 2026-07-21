import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import itemRowTheme from '@/theme/panel/item-row'

export type PanelItemRowUI = ComponentUI<typeof itemRowTheme>

export type PanelItemRowProps = {
  className?: ClassValue
  ui?: PanelItemRowUI
  children?: ReactNode
  rail?: (props: { removeClass: string }) => ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export const PanelItemRow = memo(function PanelItemRow({
  className,
  ui,
  children,
  rail,
  ...rest
}: PanelItemRowProps) {
  const styles = useMemo(() => tv(itemRowTheme)(), [])

  return (
    <div {...rest} data-slot="item-row" className={styles.root({ class: [ui?.root, className] })}>
      <div className={styles.content({ class: ui?.content })} data-slot="content">
        {children}
      </div>
      {rail ? (
        <div className={styles.rail({ class: ui?.rail })} data-slot="rail">
          {rail({ removeClass: styles.remove({ class: ui?.remove }) })}
        </div>
      ) : null}
    </div>
  )
})

PanelItemRow.displayName = 'PanelItemRow'
export default PanelItemRow
