import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'
import type { ClassValue } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelHeaderTheme } from '@/theme/panel/header'
import theme from '@/theme/panel/header'

export interface PanelHeaderProps {
  component?: boolean
  className?: ClassValue
  ui?: ComponentUI<PanelHeaderTheme>
  icon?: ReactNode
  children?: ReactNode
  actions?: ReactNode
}

export function PanelHeader({
  component = false,
  className,
  ui,
  icon,
  children,
  actions
}: PanelHeaderProps) {
  const styles = tv(theme)({ component })
  return (
    <header
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
      {actions && (
        <div data-slot="actions" className={styles.actions({ class: ui?.actions })}>
          {actions}
        </div>
      )}
    </header>
  )
}
