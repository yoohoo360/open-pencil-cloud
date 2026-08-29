import { tv } from 'tailwind-variants'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Tip } from '#react/components/ui/Tip'
import type { ControlSize } from '#react/theme/control'
import theme from '#react/theme/icon-button'

export type IconButtonProps = {
  active?: boolean
  disabled?: boolean
  label?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  size?: ControlSize
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function IconButton({
  active = false,
  disabled = false,
  label,
  side = 'top',
  size = 'xs',
  type = 'button',
  className,
  children,
  ...rest
}: IconButtonProps) {
  const cls = tv(theme)({ size, active, disabled, class: className })
  return (
    <Tip label={label} side={side} disabled={disabled || !label}>
      <button
        {...rest}
        data-slot="icon-button"
        type={type}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active ? 'true' : undefined}
        data-state={active ? 'on' : 'off'}
        className={cls}
      >
        {children}
      </button>
    </Tip>
  )
}
