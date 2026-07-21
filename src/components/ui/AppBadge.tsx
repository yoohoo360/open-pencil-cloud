import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export interface AppBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  ui?: {
    base?: string
  }
}

export const AppBadge = memo(function AppBadge({ children, className, ui, ...props }: AppBadgeProps) {
  const classes = useMemo(
    () =>
      twMerge(
        'shrink-0 rounded bg-accent/10 px-1 py-px text-[9px] text-accent',
        ui?.base,
        className
      ),
    [className, ui?.base]
  )

  return (
    <span {...props} className={classes}>
      {children}
    </span>
  )
})

AppBadge.displayName = 'AppBadge'

export default AppBadge
