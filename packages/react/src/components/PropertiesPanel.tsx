import { Code, Sparkles } from 'lucide-react'

import { useI18n } from '#react/i18n'
import { ChatPanel } from '#react/components/ChatPanel'
import { CodePanel } from '#react/components/CodePanel'
import { DesignPanel } from '#react/components/DesignPanel'
import { ZoomDropdown } from '#react/components/editor/ZoomDropdown'
import { setPropertiesTab, usePropertiesTab } from '#react/app/shell/properties-tab'

const tabClass =
  'relative rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent'

export function PropertiesPanel() {
  const { panels } = useI18n()
  const activeTab = usePropertiesTab()

  return (
    <aside
      data-test-id="properties-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
      style={{ contain: 'paint layout style' }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
          <button
            type="button"
            value="design"
            data-test-id="properties-tab-design"
            data-state={activeTab === 'design' ? 'active' : undefined}
            className={tabClass}
            onClick={() => setPropertiesTab('design')}
          >
            {panels.design}
          </button>
          <button
            type="button"
            value="code"
            data-test-id="properties-tab-code"
            data-state={activeTab === 'code' ? 'active' : undefined}
            className={`flex items-center gap-1 ${tabClass}`}
            onClick={() => setPropertiesTab('code')}
          >
            <Code className="size-3" />
            {panels.code}
          </button>
          <button
            type="button"
            value="ai"
            data-test-id="properties-tab-ai"
            data-state={activeTab === 'ai' ? 'active' : undefined}
            className={`flex items-center gap-1 ${tabClass}`}
            onClick={() => setPropertiesTab('ai')}
          >
            <Sparkles className="size-3" />
            {panels.ai}
          </button>
          {activeTab === 'design' ? <ZoomDropdown /> : null}
        </div>
        <div
          hidden={activeTab !== 'design'}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DesignPanel />
        </div>
        <div hidden={activeTab !== 'code'} className="flex min-h-0 flex-1 flex-col">
          <CodePanel active={activeTab === 'code'} />
        </div>
        <div hidden={activeTab !== 'ai'} className="flex min-h-0 flex-1 flex-col">
          <ChatPanel />
        </div>
      </div>
    </aside>
  )
}
