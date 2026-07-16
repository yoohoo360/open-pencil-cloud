import * as Tabs from '@radix-ui/react-tabs'
import { File, Plus, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { Tip, TipProvider } from '@/react_app/ui/Tip'
import {
  closeTab,
  createTab,
  getActiveTabId,
  getAllTabSummaries,
  subscribeTabs,
  switchTab
} from '@/stores/tabs'

function getTabsSnapshot() {
  return {
    tabs: getAllTabSummaries(),
    activeTabId: getActiveTabId()
  }
}

/**
 * Document tab strip. Only renders when more than one tab is open.
 */
export function TabBar() {
  const { tabs, activeTabId } = useSyncExternalStore(subscribeTabs, getTabsSnapshot, () => ({
    tabs: [],
    activeTabId: ''
  }))

  if (tabs.length <= 1) return null

  return (
    <TipProvider>
      <Tabs.Root
        value={activeTabId}
        onValueChange={(id) => switchTab(id)}
        activationMode="automatic"
        className="scrollbar-none flex h-9 shrink-0 items-end overflow-x-auto border-b border-border bg-[#1e1e1e]"
      >
        <Tabs.List className="flex h-full items-end">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              data-test-id="tabbar-tab"
              className="group/tab flex h-full max-w-48 min-w-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 text-xs transition-colors outline-none select-none focus-visible:ring-1 focus-visible:ring-accent data-[state=active]:bg-panel data-[state=active]:text-surface data-[state=inactive]:text-muted data-[state=inactive]:hover:text-surface"
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  closeTab(tab.id)
                }
              }}
            >
              <File className="size-3 shrink-0 opacity-50" />
              <span className="min-w-0 flex-1 truncate">{tab.name}</span>
              <Tip label={`Close ${tab.name}`}>
                <button
                  type="button"
                  data-test-id="tabbar-close"
                  className={`flex size-4 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity group-hover/tab:opacity-100 hover:bg-hover data-[state=active]:opacity-100 ${
                    tab.isActive ? 'opacity-100' : ''
                  }`}
                  aria-label={`Close ${tab.name}`}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  <X className="size-3" />
                </button>
              </Tip>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tip label="New tab">
          <button
            type="button"
            data-test-id="tabbar-new"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-surface"
            aria-label="New tab"
            onClick={() => createTab()}
          >
            <Plus className="size-3.5" />
          </button>
        </Tip>
      </Tabs.Root>
    </TipProvider>
  )
}
