import * as Switch from '@radix-ui/react-switch'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { SwitchTheme } from '@/theme/switch'
import theme from '@/theme/switch'

export type AppSwitchUI = ComponentUI<SwitchTheme>

export interface AppSwitchProps {
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
  size?: keyof SwitchTheme['variants']['size']
  state?: keyof SwitchTheme['variants']['state']
  ui?: AppSwitchUI
}

export const AppSwitch = memo(function AppSwitch({
  checked,
  label,
  onCheckedChange,
  size = 'sm',
  state = 'idle',
  ui
}: AppSwitchProps) {
  const styles = useMemo(() => tv(theme)({ size, state }), [size, state])

  return (
    <Switch.Root
      aria-label={label}
      checked={checked}
      className={styles.root({ class: ui?.root })}
      data-mixed={state === 'mixed' || undefined}
      onCheckedChange={onCheckedChange}
    >
      <Switch.Thumb className={styles.thumb({ class: ui?.thumb })} />
    </Switch.Root>
  )
})

AppSwitch.displayName = 'AppSwitch'

export default AppSwitch
