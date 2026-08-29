import { tv } from 'tailwind-variants'
import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

import type { ComponentUI } from '#react/components/ui/types'
import toolbarTheme from '#react/theme/toolbar'
import type { ToolbarTheme } from '#react/theme/toolbar'

export type ToolbarUI = ComponentUI<ToolbarTheme>

export function ToolButton({
  icon: Icon,
  label,
  active = false,
  mobile = false,
  ui,
  onClick,
  ...rest
}: {
  icon: LucideIcon
  label?: string
  active?: boolean
  mobile?: boolean
  ui?: ToolbarUI
  onClick?: () => void
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = tv(toolbarTheme)({ active, mobile })
  return (
    <button
      {...rest}
      type="button"
      data-active={active || undefined}
      data-mobile={mobile || undefined}
      aria-label={label}
      className={styles.button({ class: ui?.button })}
      onClick={onClick}
    >
      <Icon className={styles.icon({ class: ui?.icon })} />
    </button>
  )
}
