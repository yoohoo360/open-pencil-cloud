import {
  memo,
  useCallback,
  useMemo,
  type HTMLAttributes,
  type ReactNode
} from 'react'
import { tv, type ClassValue } from 'tailwind-variants'
import {
  PropertySectionActions,
  PropertySectionContent,
  PropertySectionEmptyAction,
  PropertySectionHeader,
  PropertySectionRoot,
  PropertySectionTitle
} from '@open-pencil/react'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelSectionTheme } from '@/theme/panel/section'
import theme from '@/theme/panel/section'

export type PanelSectionProps = {
  label: string
  open?: boolean
  defaultOpen?: boolean
  empty?: boolean
  className?: ClassValue
  ui?: ComponentUI<PanelSectionTheme>
  children?: ReactNode
  actions?: ReactNode
  emptyAction?: ReactNode
  onOpenChange?: (open: boolean) => void
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>

export const PanelSection = memo(function PanelSection({
  label,
  open,
  defaultOpen = true,
  empty = false,
  className,
  ui,
  children,
  actions,
  emptyAction,
  onOpenChange,
  ...rest
}: PanelSectionProps) {
  const controlled = open !== undefined
  const styles = useMemo(() => tv(theme)({ actions: Boolean(actions) }), [actions])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  return (
    <PropertySectionRoot
      {...rest}
      {...(controlled ? { open } : {})}
      defaultOpen={defaultOpen}
      empty={empty}
      aria-label={label}
      className={styles.root({ class: [ui?.root, className] })}
      onOpenChange={handleOpenChange}
    >
      <PropertySectionHeader className={styles.header({ class: ui?.header })}>
        <PropertySectionTitle className={styles.title({ class: ui?.title })}>
          <span role="heading" aria-level={3}>
            {label}
          </span>
        </PropertySectionTitle>
        {actions ? (
          <PropertySectionActions className={styles.actions({ class: ui?.actions })}>
            {actions}
          </PropertySectionActions>
        ) : null}
      </PropertySectionHeader>
      <PropertySectionContent className={styles.body({ class: ui?.body })}>
        {children}
        {emptyAction ? (
          <PropertySectionEmptyAction asChild>{emptyAction}</PropertySectionEmptyAction>
        ) : null}
      </PropertySectionContent>
    </PropertySectionRoot>
  )
})

PanelSection.displayName = 'PanelSection'
export default PanelSection
