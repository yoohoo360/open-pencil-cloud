import { useStore } from '@nanostores/react'
import * as Tabs from '@radix-ui/react-tabs'
import { File, Plus, X } from 'lucide-react'

import { Tip } from '@/components/ui/Tip'
import { $tabs, $activeTabId, createTab, switchTab, closeTab } from '@/app/tabs'
import { useI18n } from '@open-pencil/react'

export function TabBar() {
  const tabs = useStore($tabs)
  const activeTabId = useStore($activeTabId)
  const { dialogs } = useI18n()

  if (tabs.length <= 1) return null

  const tabItems = tabs.map((t) => ({
    id: t.id,
    name: t.store.state.documentName,
    isActive: t.id === activeTabId
  }))

  function onMiddleClick(e: React.MouseEvent, tabId: string) {
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  function onClose(e: React.MouseEvent, tabId: string) {
    e.stopPropagation()
    closeTab(tabId)
  }

  return (
    <Tabs.Root
      value={activeTabId}
      onValueChange={switchTab}
      className="scrollbar-none flex h-9 shrink-0 items-end overflow-x-auto border-b border-border bg-canvas"
    >
      <Tabs.List className="flex h-full items-end">
        {tabItems.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            data-test-id="tabbar-tab"
            className="group/tab flex h-full max-w-48 min-w-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 text-xs transition-colors outline-none select-none focus-visible:ring-1 focus-visible:ring-accent data-[state=active]:bg-panel data-[state=active]:text-surface data-[state=inactive]:text-muted data-[state=inactive]:hover:text-surface"
            onMouseDown={(e) => onMiddleClick(e, tab.id)}
          >
            <File className="size-3 shrink-0 opacity-50" />
            <span className="min-w-0 flex-1 truncate">{tab.name}</span>
            <Tip label={dialogs.closeTab({ name: tab.name })}>
              <button
                data-test-id="tabbar-close"
                className={`flex size-4 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity group-hover/tab:opacity-100 hover:bg-hover data-[state=active]:opacity-100 ${tab.isActive ? 'opacity-100' : ''}`}
                aria-label={dialogs.closeTab({ name: tab.name })}
                tabIndex={-1}
                onClick={(e) => onClose(e, tab.id)}
              >
                <X className="size-3" />
              </button>
            </Tip>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tip label={dialogs.newTab}>
        <button
          data-test-id="tabbar-new"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-surface"
          aria-label={dialogs.newTab}
          onClick={() => createTab()}
        >
          <Plus className="size-3.5" />
        </button>
      </Tip>
    </Tabs.Root>
  )
}
