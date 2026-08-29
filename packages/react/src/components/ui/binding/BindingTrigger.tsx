import { Diamond, DiamondPlus } from 'lucide-react'

import type { BindingState } from '#react/controls/binding/types'
import { useBindingFieldUI, type BindingFieldUI } from '#react/components/ui/binding/ui'

export function BindingTrigger({
  label,
  state = 'unbound',
  open = false,
  disabled = false,
  derived = false,
  className,
  ui,
  onClick
}: {
  label: string
  state?: BindingState
  open?: boolean
  disabled?: boolean
  derived?: boolean
  className?: string
  ui?: BindingFieldUI
  onClick?: () => void
}) {
  const styles = useBindingFieldUI(
    { state, open, disabled, derived },
    { ...ui, trigger: [ui?.trigger, className].filter(Boolean).join(' ') }
  )

  return (
    <button
      type="button"
      className={styles.trigger}
      disabled={disabled}
      aria-label={label}
      aria-disabled={disabled ? 'true' : undefined}
      data-state={state}
      data-open={open ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-derived={derived ? '' : undefined}
      data-slot="trigger"
      onClick={onClick}
    >
      {state === 'bound' ? <Diamond className="size-3" /> : <DiamondPlus className="size-3" />}
    </button>
  )
}
