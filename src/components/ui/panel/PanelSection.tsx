import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'
import type { ClassValue } from 'tailwind-variants'

import { PropertySectionActions, PropertySectionContent, PropertySectionEmptyAction, PropertySectionHeader, PropertySectionRoot, PropertySectionTitle } from '@open-pencil/react'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelSectionTheme } from '@/theme/panel/section'
import theme from '@/theme/panel/section'

export interface PanelSectionProps {
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
}

export function PanelSection({
  label,
  open,
  defaultOpen = true,
  empty = false,
  className,
  ui,
  children,
  actions,
  emptyAction,
  onOpenChange
}: PanelSectionProps) {
  const styles = tv(theme)({ actions: Boolean(actions) })
  const controlled = open !== undefined

  return (
    <PropertySectionRoot
      as="section"
      {...(controlled ? { open } : {})}
      defaultOpen={defaultOpen}
      empty={empty}
      aria-label={label}
      className={styles.root({ class: [ui?.root, className] })}
      onOpenChange={onOpenChange}
    >
      <PropertySectionHeader className={styles.header({ class: ui?.header })}>
        <PropertySectionTitle className={styles.title({ class: ui?.title })}>
          <span role="heading" aria-level={3}>{label}</span>
        </PropertySectionTitle>
        {actions && (
          <PropertySectionActions className={styles.actions({ class: ui?.actions })}>
            {actions}
          </PropertySectionActions>
        )}
      </PropertySectionHeader>
      <PropertySectionContent className={styles.body({ class: ui?.body })}>
        {children}
        {emptyAction && (
          <PropertySectionEmptyAction asChild>
            {emptyAction}
          </PropertySectionEmptyAction>
        )}
      </PropertySectionContent>
    </PropertySectionRoot>
  )
}
