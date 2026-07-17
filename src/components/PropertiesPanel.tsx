import { useStore } from '@nanostores/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'

import { useI18n } from '@open-pencil/react'
import { $activeTab } from '@/app/ai/chat/use'

import ChatPanel from './ChatPanel'
import CodePanel from './CodePanel'
import DesignPanel from './DesignPanel'
import ZoomDropdown from './editor/ZoomDropdown'

import IconLucideCode from '~icons/lucide/code'
import IconLucideSparkles from '~icons/lucide/sparkles'

export default function PropertiesPanel() {
  const activeTab = useStore($activeTab)
  const { panels } = useI18n()

  return (
    <aside
      data-test-id="properties-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
      style={{ contain: 'paint layout style' } as React.CSSProperties}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => $activeTab.set(v as 'design' | 'code' | 'ai')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
          <TabsTrigger
            value="design"
            data-test-id="properties-tab-design"
            className="rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            {panels.design}
          </TabsTrigger>
          <TabsTrigger
            value="code"
            data-test-id="properties-tab-code"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            <IconLucideCode className="size-3" />
            {panels.code}
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            data-test-id="properties-tab-ai"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            <IconLucideSparkles className="size-3" />
            {panels.ai}
          </TabsTrigger>
          {activeTab === 'design' && <ZoomDropdown />}
        </TabsList>

        <TabsContent value="design" className="flex min-h-0 flex-1 flex-col" forceMount hidden={activeTab !== 'design'}>
          <DesignPanel />
        </TabsContent>
        <TabsContent value="code" className="flex min-h-0 flex-1 flex-col" forceMount hidden={activeTab !== 'code'}>
          <CodePanel />
        </TabsContent>
        <TabsContent value="ai" className="flex min-h-0 flex-1 flex-col" forceMount hidden={activeTab !== 'ai'}>
          <ChatPanel />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
