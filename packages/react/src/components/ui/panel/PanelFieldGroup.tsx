import type { ComponentUI } from '#react/components/ui/types'
import theme from '#react/theme/panel/field-group'
import type { PanelFieldGroupTheme } from '#react/theme/panel/field-group'
import type { ReactNode } from 'react'
import { tv } from 'tailwind-variants'

export type PanelFieldGroupUI = ComponentUI<PanelFieldGroupTheme>

export function PanelFieldGroup({
  label,
  className,
  ui,
  children
}: {
  label: ReactNode
  className?: string
  ui?: PanelFieldGroupUI
  children?: ReactNode
}) {
  const styles = tv(theme)()

  return (
    <div className={styles.root({ class: className })}>
      <span className={styles.label({ class: ui?.label })}>{label}</span>

      <div className={styles.container({ class: ui?.container })}>{children}</div>
    </div>
  )
}
