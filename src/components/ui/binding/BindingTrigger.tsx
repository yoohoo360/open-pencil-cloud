import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import type { BindingState } from '@open-pencil/react'
import { useBindingFieldUI, type BindingFieldUI } from '@/components/ui/binding/ui'

import IconLucideDiamond from '~icons/lucide/diamond'
import IconLucideDiamondPlus from '~icons/lucide/diamond-plus'

export interface BindingTriggerProps extends Omit<ComponentPropsWithoutRef<'button'>, 'className'> {
  label: string
  state?: BindingState
  open?: boolean
  disabled?: boolean
  derived?: boolean
  className?: string
  ui?: BindingFieldUI
  children?: ReactNode
}

export function BindingTrigger({
  label,
  state = 'unbound',
  open = false,
  disabled = false,
  derived = false,
  className,
  ui,
  children,
  ...rest
}: BindingTriggerProps) {
  const styles = useBindingFieldUI(
    { state, open, disabled, derived },
    { ...ui, trigger: [ui?.trigger, className].filter(Boolean).join(' ') }
  )

  return (
    <button
      {...rest}
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
    >
      {children ?? (state === 'bound' ? (
        <IconLucideDiamond className="size-3" />
      ) : (
        <IconLucideDiamondPlus className="size-3" />
      ))}
    </button>
  )
}
