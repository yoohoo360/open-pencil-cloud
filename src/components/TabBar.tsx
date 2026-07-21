import IconLucideFile from '~icons/lucide/file'
import IconLucidePlus from '~icons/lucide/plus'
import IconLucideX from '~icons/lucide/x'
import { memo, useCallback, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { useI18n } from '@open-pencil/react'
import Tip from '@/components/ui/Tip'
import { createTab, useTabsStore } from '@/app/tabs'
import tabBarTheme from '@/theme/tab-bar'

export const TabBar = memo(function TabBar() {
  const { dialogs } = useI18n()
  const { tabs, activeTabId, switchTab, closeTab } = useTabsStore()
  const tabBarStyles = tv(tabBarTheme)
  const baseStyles = useMemo(() => tabBarStyles(), [tabBarStyles])

  const onMiddleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, tabId: string) => {
      if (event.button === 1) {
        event.preventDefault()
        closeTab(tabId)
      }
    },
    [closeTab]
  )

  const onClose = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, tabId: string) => {
      event.stopPropagation()
      closeTab(tabId)
    },
    [closeTab]
  )

  if (tabs.length <= 1) return null

  return (
    <div className={baseStyles.root()} role="tablist">
      <div className={baseStyles.list()}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.isActive}
            data-test-id="tabbar-tab"
            data-state={tab.isActive ? 'active' : 'inactive'}
            className={tabBarStyles({ active: tab.isActive }).trigger()}
            data-active={tab.isActive || undefined}
            onClick={() => switchTab(tab.id)}
            onMouseDown={(event) => onMiddleClick(event, tab.id)}
          >
            <IconLucideFile className={baseStyles.icon()} />
            <span className={baseStyles.label()}>{tab.name}</span>
            <Tip label={dialogs.closeTab({ name: tab.name })}>
              <button
                type="button"
                data-test-id="tabbar-close"
                className={tabBarStyles({ active: tab.isActive }).close()}
                data-active={tab.isActive || undefined}
                aria-label={dialogs.closeTab({ name: tab.name })}
                tabIndex={-1}
                onClick={(event) => onClose(event, tab.id)}
              >
                <IconLucideX className={baseStyles.closeIcon()} />
              </button>
            </Tip>
          </button>
        ))}
      </div>
      <Tip label={dialogs.newTab}>
        <button
          type="button"
          data-test-id="tabbar-new"
          className={baseStyles.newAction()}
          aria-label={dialogs.newTab}
          onClick={() => createTab()}
        >
          <IconLucidePlus className={baseStyles.newIcon()} />
        </button>
      </Tip>
    </div>
  )
})

TabBar.displayName = 'TabBar'
export default TabBar
