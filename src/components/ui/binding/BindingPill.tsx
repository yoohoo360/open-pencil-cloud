import { memo, useMemo, type HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

import Tip from '@/components/ui/Tip'
import { useBindingFieldUI, type BindingFieldUI } from '@/components/ui/binding/ui'

export type BindingPillProps = {
  label: string
  tooltip?: string
  disabled?: boolean
  derived?: boolean
  className?: string
  ui?: BindingFieldUI
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>

export const BindingPill = memo(function BindingPill({
  label,
  tooltip,
  disabled = false,
  derived = false,
  className,
  ui,
  ...rest
}: BindingPillProps) {
  const styles = useMemo(
    () =>
      useBindingFieldUI(
        { state: 'bound', disabled, derived },
        { ...ui, pill: twMerge(ui?.pill, className) }
      ),
    [className, derived, disabled, ui]
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
})

BindingPill.displayName = 'BindingPill'
export default BindingPill
