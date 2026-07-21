import { memo } from 'react'
import { tv } from 'tailwind-variants'

import type { ToolbarActionItem, ToolbarUI } from '@/components/Toolbar/types'
import toolbarTheme from '@/theme/toolbar'

export type ToolbarActionGroupProps = {
  actions: ToolbarActionItem[]
  testPrefix: string
  ui?: ToolbarUI
  onAction: (item: ToolbarActionItem) => void
}

export const ToolbarActionGroup = memo(function ToolbarActionGroup({
  actions,
  testPrefix,
  ui,
  onAction
}: ToolbarActionGroupProps) {
  const styles = tv(toolbarTheme)()

  return (
    <>
      {actions.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            type="button"
            data-test-id={`${testPrefix}-${item.label.toLowerCase()}`}
            className={styles.action({ class: ui?.action })}
            onClick={() => onAction(item)}
          >
            <Icon className={styles.actionIcon({ class: ui?.actionIcon })} />
          </button>
        )
      })}
    </>
  )
})

ToolbarActionGroup.displayName = 'ToolbarActionGroup'
export default ToolbarActionGroup
