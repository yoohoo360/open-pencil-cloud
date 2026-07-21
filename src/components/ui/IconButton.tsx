import { memo, useMemo, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import Tip from '@/components/ui/Tip'
import theme from '@/theme/icon-button'

export type IconButtonProps = {
  active?: boolean
  disabled?: boolean
  label?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  className?: string
  children?: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'>

export const IconButton = memo(function IconButton({
  active = false,
  disabled = false,
  label,
  side = 'top',
  size = 'sm',
  type = 'button',
  className,
  children,
  ...buttonAttrs
}: IconButtonProps) {
  const cls = useMemo(
    () => tv(theme)({ size, active, disabled, class: className }),
    [active, className, disabled, size]
  )

  return (
    <Tip label={label} side={side} disabled={disabled || !label}>
      <button
        {...buttonAttrs}
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

IconButton.displayName = 'IconButton'
export default IconButton
