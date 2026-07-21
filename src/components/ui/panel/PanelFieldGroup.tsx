import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelFieldGroupTheme } from '@/theme/panel/field-group'
import theme from '@/theme/panel/field-group'

export type PanelFieldGroupProps = {
  label?: string
  htmlFor?: string
  className?: ClassValue
  ui?: ComponentUI<PanelFieldGroupTheme>
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export const PanelFieldGroup = memo(function PanelFieldGroup({
  label,
  htmlFor,
  className,
  ui,
  children,
  ...rest
}: PanelFieldGroupProps) {
  const styles = useMemo(() => tv(theme)(), [])

  return (
    <div
      {...rest}
      data-slot="root"
      data-panel-field-group
      className={styles.root({ class: [ui?.root, className] })}
    >
      {label ? (
        <label data-slot="label" htmlFor={htmlFor} className={styles.label({ class: ui?.label })}>
          {label}
        </label>
      ) : null}
      <div data-slot="container" className={styles.container({ class: ui?.container })}>
        {children}
      </div>
    </div>
  )
})

PanelFieldGroup.displayName = 'PanelFieldGroup'
export default PanelFieldGroup
