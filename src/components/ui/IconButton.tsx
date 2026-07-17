import { forwardRef } from 'react'
import { tv } from 'tailwind-variants'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { Tip } from '@/components/ui/Tip'
import theme from '@/theme/icon-button'

export interface IconButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'type'> {
  active?: boolean
  label?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  children?: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    active = false,
    disabled = false,
    label,
    side = 'top',
    size = 'sm',
    type = 'button',
    className,
    children,
    ...rest
  },
  ref
) {
  const cls = tv(theme)({ size, active, disabled, class: className })
  return (
    <Tip label={label} side={side} disabled={disabled || !label}>
      <button
        ref={ref}
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
})
