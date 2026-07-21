import { memo, useMemo, type ButtonHTMLAttributes, type ComponentType } from 'react'
import { tv } from 'tailwind-variants'

import type { ToolbarUI } from '@/components/Toolbar/types'
import toolbarTheme from '@/theme/toolbar'

export type ToolButtonProps = {
  icon: ComponentType<{ className?: string }>
  label?: string
  active?: boolean
  mobile?: boolean
  ui?: ToolbarUI
  onClick?: () => void
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>

export const ToolButton = memo(function ToolButton({
  icon: Icon,
  label,
  active = false,
  mobile = false,
  ui,
  onClick,
  className,
  ...rest
}: ToolButtonProps) {
  const toolbar = tv(toolbarTheme)
  const styles = useMemo(() => toolbar({ active, mobile }), [active, mobile, toolbar])

  return (
    <button
      {...rest}
      type="button"
      data-active={active || undefined}
      data-mobile={mobile || undefined}
      aria-label={label}
      className={styles.button({ class: [ui?.button, className] })}
      onClick={onClick}
    >
      <Icon className={styles.icon({ class: ui?.icon })} />
    </button>
  )
})

ToolButton.displayName = 'ToolButton'
export default ToolButton
