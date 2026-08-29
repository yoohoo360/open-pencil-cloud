import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'

import theme from '#react/theme/panel/header'

export function PanelHeader({
  component = false,
  icon,
  actions,
  children
}: {
  component?: boolean
  icon?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const styles = tv(theme)({ component })
  return (
    <header data-slot="root" data-component={component ? '' : undefined} className={styles.root()}>
      <div data-slot="icon" className={styles.icon()}>
        {icon}
      </div>
      <div data-slot="title" className={styles.title()}>
        {children}
      </div>
      {actions ? (
        <div data-slot="actions" className={styles.actions()}>
          {actions}
        </div>
      ) : null}
    </header>
  )
}
