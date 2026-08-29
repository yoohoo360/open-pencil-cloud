import { tv, type VariantProps } from 'tailwind-variants'
import type { ReactNode } from 'react'

import type { ComponentUI } from '#react/components/ui/types'
import placeholderTheme from '#react/theme/placeholder'

const placeholder = tv(placeholderTheme)

type PlaceholderVariants = VariantProps<typeof placeholder>
type PlaceholderUI = ComponentUI<typeof placeholderTheme>

export function AppPlaceholder({
  label,
  description,
  fill = true,
  size = 'panel',
  ui,
  icon,
  action,
  'data-test-id': dataTestId
}: {
  label: string
  description?: string
  fill?: boolean
  size?: PlaceholderVariants['size']
  ui?: PlaceholderUI
  icon?: ReactNode
  action?: ReactNode
  'data-test-id'?: string
}) {
  const theme = placeholder({ fill, size })
  const styles = {
    root: theme.root({ class: ui?.root }),
    content: theme.content({ class: ui?.content }),
    icon: theme.icon({ class: ui?.icon }),
    label: theme.label({ class: ui?.label }),
    description: theme.description({ class: ui?.description }),
    action: theme.action({ class: ui?.action })
  }

  return (
    <div className={styles.root} data-slot="placeholder" data-test-id={dataTestId}>
      <div className={styles.content} data-slot="placeholder-content">
        {icon ? (
          <div className={styles.icon} data-slot="placeholder-icon" aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <p className={styles.label} data-slot="placeholder-label">
          {label}
        </p>
        {description ? (
          <p className={styles.description} data-slot="placeholder-description">
            {description}
          </p>
        ) : null}
        {action ? (
          <div className={styles.action} data-slot="placeholder-action">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}
