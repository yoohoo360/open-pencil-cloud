import type { InputHTMLAttributes } from 'react'

import { panelFieldBase } from '#react/theme/panel/field'

export function AppInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`${panelFieldBase} w-full min-w-0 px-1.5 text-[11px] ${className ?? ''}`}
    />
  )
}
