import { tv } from 'tailwind-variants'

import type { ToolbarActionItem, ToolbarUI } from '#react/components/Toolbar/types'
import toolbarTheme from '#react/theme/toolbar'

export function ToolbarActionGroup({
  actions,
  testPrefix,
  ui,
  onAction
}: {
  actions: ToolbarActionItem[]
  testPrefix: string
  ui?: ToolbarUI
  onAction: (item: ToolbarActionItem) => void
}) {
  const styles = tv(toolbarTheme)()
  return (
    <>
      {actions.map((item) => (
        <button
          key={item.label}
          type="button"
          data-test-id={`${testPrefix}-${item.label.toLowerCase()}`}
          className={styles.action({ class: ui?.action })}
          aria-label={item.label}
          onClick={() => onAction(item)}
        >
          <item.icon className={styles.actionIcon({ class: ui?.actionIcon })} />
        </button>
      ))}
    </>
  )
}
