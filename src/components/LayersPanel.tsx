import { useState } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'

import { useI18n } from '@open-pencil/react'

import { AppMenu } from '@/components/Shell/AppMenu'
import AssetsPanel from './AssetsPanel'
import { LayerTree } from './LayerTree/LayerTree'
import PagesPanel from './PagesPanel'

export default function LayersPanel() {
  const { menu, panels } = useI18n()
  const [activePanel, setActivePanel] = useState<'file' | 'assets'>('file')

  return (
    <aside
      data-test-id="layers-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-panel"
      style={{ contain: 'paint layout style' } as React.CSSProperties}
    >
      <AppMenu />
      <div className="flex shrink-0 gap-1 border-b border-border px-2 py-1.5">
        <button
          data-test-id="left-panel-layers-tab"
          className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
            activePanel === 'file' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'
          }`}
          onClick={() => setActivePanel('file')}
        >
          {menu.file}
        </button>
        <button
          data-test-id="left-panel-assets-tab"
          className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
            activePanel === 'assets' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'
          }`}
          onClick={() => setActivePanel('assets')}
        >
          {panels.assets}
        </button>
      </div>
      {activePanel === 'assets' ? (
        <AssetsPanel />
      ) : (
        <PanelGroup direction="vertical" autoSaveId="layers-layout" className="flex-1 overflow-hidden">
          <Panel defaultSize={30} minSize={10} maxSize={60} className="flex flex-col overflow-hidden">
            <PagesPanel />
          </Panel>
          <PanelResizeHandle className="group relative z-10 -my-1 h-2 cursor-row-resize">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          </PanelResizeHandle>
          <Panel defaultSize={70} minSize={20} className="flex flex-col overflow-hidden">
            <header
              data-test-id="layers-header"
              className="shrink-0 px-3 py-2 text-[11px] tracking-wider text-muted uppercase"
            >
              {panels.layers}
            </header>
            <LayerTree data-test-id="layers-tree" />
          </Panel>
        </PanelGroup>
      )}
    </aside>
  )
}
