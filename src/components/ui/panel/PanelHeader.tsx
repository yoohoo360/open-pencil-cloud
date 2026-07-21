import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelHeaderTheme } from '@/theme/panel/header'
import theme from '@/theme/panel/header'

export type PanelHeaderProps = {
  component?: boolean
  className?: ClassValue
  ui?: ComponentUI<PanelHeaderTheme>
  icon?: ReactNode
  actions?: ReactNode
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>

export const PanelHeader = memo(function PanelHeader({
  component = false,
  className,
  ui,
  icon,
  actions,
  children,
  ...rest
}: PanelHeaderProps) {
  const styles = useMemo(() => tv(theme)({ component }), [component])

  return (
    <header
      {...rest}
      data-slot="root"
      data-component={component ? '' : undefined}
      className={styles.root({ class: [ui?.root, className] })}
    >
      <div data-slot="icon" className={styles.icon({ class: ui?.icon })}>
        {icon}
      </div>
      <div data-slot="title" className={styles.title({ class: ui?.title })}>
        {children}
      </div>
      {actions ? (
        <div data-slot="actions" className={styles.actions({ class: ui?.actions })}>
          {actions}
        </div>
      ) : null}
    </header>
  )
})

PanelHeader.displayName = 'PanelHeader'
export default PanelHeader
