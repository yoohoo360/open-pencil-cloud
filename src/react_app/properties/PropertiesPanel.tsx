import * as Tabs from '@radix-ui/react-tabs'
import { Code, Sparkles } from 'lucide-react'
import { useSyncExternalStore, type ComponentType } from 'react'
import { applyVueInReact } from 'veaury'
import { watch } from 'vue'

import ChatPanelVue from '@/components/ChatPanel.vue'
import { useAIChat } from '@/composables/use-chat'
import { CodePanel } from '@/react_app/panels/CodePanel'
import { DesignPanel } from '@/react_app/properties/DesignPanel'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { ZoomDropdownInner } from '@/react_app/shell/ZoomDropdown'
import { useI18n } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type PropertiesTab = 'design' | 'code' | 'ai'

const ChatPanel = applyVueInReact(ChatPanelVue) as ComponentType

function subscribePropertiesTab(onStoreChange: () => void) {
  const { activeTab } = useAIChat()
  return watch(activeTab, onStoreChange, { flush: 'sync' })
}

function getPropertiesTab(): PropertiesTab {
  return useAIChat().activeTab.value
}

function PropertiesPanelInner() {
  const { panels } = useI18n()
  const activeTab = useSyncExternalStore(
    subscribePropertiesTab,
    getPropertiesTab,
    () => 'design' as PropertiesTab
  )
  const setActiveTab = (tab: PropertiesTab) => {
    useAIChat().activeTab.value = tab
  }

  return (
    <aside
      data-test-id="properties-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
      style={{ contain: 'paint layout style' }}
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PropertiesTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs.List className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
          <Tabs.Trigger
            value="design"
            data-test-id="properties-tab-design"
            className="rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            {panels.design}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="code"
            data-test-id="properties-tab-code"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            <Code className="size-3" />
            {panels.code}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="ai"
            data-test-id="properties-tab-ai"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            <Sparkles className="size-3" />
            {panels.ai}
          </Tabs.Trigger>
          {activeTab === 'design' ? <ZoomDropdownInner /> : null}
        </Tabs.List>

        <Tabs.Content
          value="design"
          className="flex min-h-0 flex-1 flex-col"
          forceMount
          hidden={activeTab !== 'design'}
        >
          <DesignPanel />
        </Tabs.Content>
        <Tabs.Content
          value="code"
          className="flex min-h-0 flex-1 flex-col"
          forceMount
          hidden={activeTab !== 'code'}
        >
          <CodePanel />
        </Tabs.Content>
        <Tabs.Content
          value="ai"
          className="flex min-h-0 flex-1 flex-col"
          forceMount
          hidden={activeTab !== 'ai'}
        >
          <ChatPanel />
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}

export function PropertiesPanel({ editor }: { editor: Editor }) {
  return (
    <EditorBridge editor={editor}>
      <PropertiesPanelInner />
    </EditorBridge>
  )
}
