import { Tip } from '#react/components/ui/Tip'
import { useBindingFieldUI, type BindingFieldUI } from '#react/components/ui/binding/ui'

export function BindingPill({
  label,
  tooltip,
  disabled = false,
  derived = false,
  className,
  ui
}: {
  label: string
  tooltip?: string
  disabled?: boolean
  derived?: boolean
  className?: string
  ui?: BindingFieldUI
}) {
  const styles = useBindingFieldUI(
    { state: 'bound', disabled, derived },
    { ...ui, pill: [ui?.pill, className].filter(Boolean).join(' ') }
  )

  return (
    <Tip label={tooltip} disabled={!tooltip}>
      <span
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
