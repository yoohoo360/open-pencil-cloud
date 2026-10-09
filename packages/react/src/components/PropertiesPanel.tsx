import { setPropertiesTab, usePropertiesTab } from '#react/app/shell/properties-tab'
import { useWorkspaceMode } from '#react/app/shell/workspace-mode'
import { ChatPanel } from '#react/components/ChatPanel'
import { CodePanel } from '#react/components/CodePanel'
import { DesignPanel } from '#react/components/DesignPanel'
import { ZoomDropdown } from '#react/components/editor/ZoomDropdown'
import { useI18n } from '#react/i18n'
import { Code, Sparkles } from 'lucide-react'

const tabClass =
  'relative rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent'

export function PropertiesPanel() {
  const { panels } = useI18n()
  const activeTab = usePropertiesTab()
  const mode = useWorkspaceMode()
  // Dev mode is code-first; View keeps Design for inspect (read-only gated elsewhere).
  const showDesignTab = mode !== 'dev'
  const showCodeTab = true
  // Edit: design AI chat. Dev: codegen chat (Code | AI at the properties top).
  const showAiTab = mode === 'edit' || mode === 'dev'
  const codePanelActive =
    activeTab === 'code' || (mode === 'dev' && activeTab === 'ai')
  const codePanelView = mode === 'dev' && activeTab === 'ai' ? 'ai' : 'source'

  return (
    <aside
      data-test-id="properties-panel"
      data-workspace-mode={mode}
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
      style={{ contain: 'paint layout style' }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
          {showDesignTab ? (
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
          ) : null}
          {showCodeTab ? (
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
          ) : null}
          {showAiTab ? (
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
          ) : null}
          {activeTab === 'design' && showDesignTab ? <ZoomDropdown /> : null}
        </div>
        {showDesignTab ? (
          <div
            hidden={activeTab !== 'design'}
            data-readonly={mode === 'view' || undefined}
            className={`flex min-h-0 flex-1 flex-col ${mode === 'view' ? 'pointer-events-none select-none opacity-90' : ''}`}
          >
            <DesignPanel />
          </div>
        ) : null}
        <div hidden={!codePanelActive} className="flex min-h-0 flex-1 flex-col">
          <CodePanel active={codePanelActive} viewTab={codePanelView} />
        </div>
        {mode === 'edit' ? (
          <div hidden={activeTab !== 'ai'} className="flex min-h-0 flex-1 flex-col">
            <ChatPanel />
          </div>
        ) : null}
      </div>
    </aside>
  )
}
