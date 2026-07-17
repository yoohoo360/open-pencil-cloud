import type { HTMLAttributes } from 'react'

import { Tip } from '@/components/ui/Tip'
import { useBindingFieldUI, type BindingFieldUI } from '@/components/ui/binding/ui'

export interface BindingPillProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  label: string
  tooltip?: string
  disabled?: boolean
  derived?: boolean
  className?: string
  ui?: BindingFieldUI
}

export function BindingPill({
  label,
  tooltip,
  disabled = false,
  derived = false,
  className,
  ui,
  ...rest
}: BindingPillProps) {
  const styles = useBindingFieldUI(
    { state: 'bound', disabled, derived },
    { ...ui, pill: [ui?.pill, className].filter(Boolean).join(' ') }
  )

  return (
    <Tip label={tooltip} disabled={!tooltip}>
      <span
        {...rest}
        className={styles.pill}
        data-disabled={disabled ? '' : undefined}
        data-derived={derived ? '' : undefined}
        data-slot="pill"
      >
        <span className={styles.pillLabel}>{label}</span>
      </span>
    </Tip>
  )
}
