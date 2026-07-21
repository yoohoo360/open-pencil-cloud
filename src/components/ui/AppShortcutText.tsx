import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export interface AppShortcutTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  ui?: {
    base?: string
  }
}

export const AppShortcutText = memo(function AppShortcutText({
  children,
  className,
  ui,
  ...props
}: AppShortcutTextProps) {
  const classes = useMemo(
    () => twMerge('text-[11px] text-muted', ui?.base, className),
    [className, ui?.base]
  )

  return (
    <span {...props} className={classes}>
      {children}
    </span>
  )
})

AppShortcutText.displayName = 'AppShortcutText'

export default AppShortcutText
