import type { ButtonHTMLAttributes, ReactNode } from 'react'

import {
  useAppButtonUI,
  type AppButtonColor,
  type AppButtonShape,
  type AppButtonSize,
  type AppButtonVariant
} from '#react/theme/button'

export function AppButton({
  color = 'neutral',
  variant = 'ghost',
  size = 'sm',
  shape = 'rounded',
  disabled = false,
  className,
  children,
  ...rest
}: {
  color?: AppButtonColor
  variant?: AppButtonVariant
  size?: AppButtonSize
  shape?: AppButtonShape
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = useAppButtonUI({ color, variant, size, shape, ui: { base: className } })
  return (
    <button
      {...rest}
      data-slot="button"
      disabled={disabled}
      aria-disabled={disabled ? 'true' : undefined}
      className={styles.base}
    >
      {children}
    </button>
  )
}
