import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'
import type { ClassValue } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelFieldGroupTheme } from '@/theme/panel/field-group'
import theme from '@/theme/panel/field-group'

export interface PanelFieldGroupProps {
  label?: string
  htmlFor?: string
  className?: ClassValue
  ui?: ComponentUI<PanelFieldGroupTheme>
  children?: ReactNode
}

export function PanelFieldGroup({ label, htmlFor, className, ui, children }: PanelFieldGroupProps) {
  const styles = tv(theme)()
  return (
    <div
      data-slot="root"
      data-panel-field-group
      className={styles.root({ class: [ui?.root, className] })}
    >
      {label && (
        <label data-slot="label" htmlFor={htmlFor} className={styles.label({ class: ui?.label })}>
          {label}
        </label>
      )}
      <div data-slot="container" className={styles.container({ class: ui?.container })}>
        {children}
      </div>
    </div>
  )
}
