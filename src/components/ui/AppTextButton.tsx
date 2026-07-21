import { memo, useMemo, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export interface AppTextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: 'xs' | 'sm'
  ui?: {
    base?: string
  }
  underline?: boolean
}

export const AppTextButton = memo(function AppTextButton({
  children,
  className,
  size = 'sm',
  type = 'button',
  ui,
  underline = false,
  ...props
}: AppTextButtonProps) {
  const classes = useMemo(
    () =>
      twMerge(
        'cursor-pointer text-muted hover:text-surface',
        size === 'xs' ? 'text-[9px]' : 'text-[10px]',
        underline && 'underline',
        ui?.base,
        className
      ),
    [className, size, ui?.base, underline]
  )

  return (
    <button {...props} className={classes} type={type}>
      {children}
    </button>
  )
})

AppTextButton.displayName = 'AppTextButton'

export default AppTextButton
