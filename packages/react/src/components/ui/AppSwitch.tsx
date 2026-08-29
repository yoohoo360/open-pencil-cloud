import type { ButtonHTMLAttributes } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '#react/components/ui/types'
import theme, { type SwitchTheme } from '#react/theme/switch'

export type AppSwitchUI = ComponentUI<SwitchTheme>
export type AppSwitchSize = keyof SwitchTheme['variants']['size']
export type AppSwitchState = keyof SwitchTheme['variants']['state']

export function AppSwitch({
  checked,
  label,
  size = 'sm',
  state = 'idle',
  ui,
  onCheckedChange,
  ...rest
}: {
  checked: boolean
  label: string
  size?: AppSwitchSize
  state?: AppSwitchState
  ui?: AppSwitchUI
  onCheckedChange: (checked: boolean) => void
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'role' | 'aria-checked' | 'onChange'>) {
  const styles = tv(theme)({ size, state })
  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={state === 'mixed' ? 'mixed' : checked}
      data-mixed={state === 'mixed' || undefined}
      data-state={checked ? 'checked' : 'unchecked'}
      className={styles.root({ class: ui?.root })}
      onClick={() => onCheckedChange(state === 'mixed' ? true : !checked)}
    >
      <span data-state={checked ? 'checked' : 'unchecked'} className={styles.thumb({ class: ui?.thumb })} />
    </button>
  )
}
