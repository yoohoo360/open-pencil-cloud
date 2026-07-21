import IconLucideCode from '~icons/lucide/code'
import IconLucideSparkles from '~icons/lucide/sparkles'
import { memo } from 'react'

import { useI18n } from '@open-pencil/react'
import { useAIChat } from '@/app/ai/chat/use'
import { useVueRefValue } from '@/shared/useVueRefValue'
import ChatPanel from '@/components/ChatPanel'
import CodePanel from '@/components/CodePanel'
import DesignPanel from '@/components/DesignPanel'
import ZoomDropdown from '@/components/editor/ZoomDropdown'

export const PropertiesPanel = memo(function PropertiesPanel() {
  const { activeTab } = useAIChat()
  const tab = useVueRefValue(activeTab)
  const { panels } = useI18n()

  return (
    <aside
      data-test-id="properties-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
      style={{ contain: 'paint layout style' }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'design'}
            data-test-id="properties-tab-design"
            data-state={tab === 'design' ? 'active' : 'inactive'}
            className="relative rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent"
            onClick={() => {
              activeTab.value = 'design'
            }}
          >
            {panels.design}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'code'}
            data-test-id="properties-tab-code"
            data-state={tab === 'code' ? 'active' : 'inactive'}
            className="relative flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent"
            onClick={() => {
              activeTab.value = 'code'
            }}
          >
            <IconLucideCode className="size-3" />
            {panels.code}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ai'}
            data-test-id="properties-tab-ai"
            data-state={tab === 'ai' ? 'active' : 'inactive'}
            className="relative flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent"
            onClick={() => {
              activeTab.value = 'ai'
            }}
          >
            <IconLucideSparkles className="size-3" />
            {panels.ai}
          </button>
          {tab === 'design' ? <ZoomDropdown /> : null}
        </div>

        <div
          role="tabpanel"
          hidden={tab !== 'design'}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DesignPanel />
        </div>
        <div role="tabpanel" hidden={tab !== 'code'} className="flex min-h-0 flex-1 flex-col">
          <CodePanel />
        </div>
        <div role="tabpanel" hidden={tab !== 'ai'} className="flex min-h-0 flex-1 flex-col">
          <ChatPanel />
        </div>
      </div>
    </aside>
  )
})

PropertiesPanel.displayName = 'PropertiesPanel'
export default PropertiesPanel
