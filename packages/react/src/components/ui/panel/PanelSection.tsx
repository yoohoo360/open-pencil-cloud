import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'

import theme from '#react/theme/panel/section'

export function PanelSection({
  label,
  empty = false,
  actions,
  children
}: {
  label: string
  empty?: boolean
  actions?: ReactNode
  children?: ReactNode
}) {
  const styles = tv(theme)({ actions: Boolean(actions) })
  return (
    <section data-slot="root" aria-label={label} className={styles.root()}>
      <div data-slot="header" className={styles.header()}>
        <div data-slot="title" className={styles.title()}>
          <span role="heading" aria-level={3}>
            {label}
          </span>
        </div>
        {actions ? (
          <div data-slot="actions" className={styles.actions()}>
            {actions}
          </div>
        ) : null}
      </div>
      <div data-slot="body" data-state={empty ? 'closed' : 'open'} className={styles.body()}>
        {empty ? null : children}
      </div>
    </section>
  )
}
