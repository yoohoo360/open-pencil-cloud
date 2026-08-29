import type { InputHTMLAttributes } from 'react'
import { tv } from 'tailwind-variants'

import type { ControlSize } from '#react/theme/control'
import theme from '#react/theme/input'

export type AppInputTone = 'default' | 'panel'
export type AppInputState = 'idle' | 'mixed' | 'bound' | 'invalid'

export function AppInput({
  className,
  tone = 'panel',
  size = 'xs',
  state = 'idle',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  tone?: AppInputTone
  size?: ControlSize
  state?: AppInputState
}) {
  return <input {...rest} className={tv(theme)({ tone, size, state, class: className })} />
}
