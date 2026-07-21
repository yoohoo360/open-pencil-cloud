import { memo, useMemo, useState } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'

import { useI18n } from '@open-pencil/react'
import AppMenu from '@/components/Shell/AppMenu'
import SegmentedControl from '@/components/ui/SegmentedControl'
import AssetsPanel from '@/components/AssetsPanel'
import LayerTree from '@/components/LayerTree/LayerTree'
import PagesPanel from '@/components/PagesPanel'

export const LayersPanel = memo(function LayersPanel() {
  const { menu, panels } = useI18n()
  const [activePanel, setActivePanel] = useState<'file' | 'assets'>('file')

  const panelOptions = useMemo(
    () => [
      { value: 'file', label: menu.file },
      { value: 'assets', label: panels.assets }
    ],
    [menu.file, panels.assets]
  )

  const panelTabsUI = useMemo(() => ({ root: 'w-full' }), [])

  return (
    <aside
      data-test-id="layers-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-panel"
      style={{ contain: 'paint layout style' }}
    >
      <AppMenu />
      <div className="shrink-0 border-b border-border px-2 py-1.5">
        <SegmentedControl
          value={activePanel}
          onValueChange={(value) => {
            if (value === 'file' || value === 'assets') setActivePanel(value)
          }}
          options={panelOptions}
          label={panels.layers}
          ui={panelTabsUI}
          renderOption={({ option }) => (
            <span
              data-test-id={
                option.value === 'file' ? 'left-panel-layers-tab' : 'left-panel-assets-tab'
              }
              className="truncate"
            >
              {option.label}
            </span>
          )}
        />
      </div>
      {activePanel === 'assets' ? (
        <AssetsPanel />
      ) : (
        <PanelGroup orientation="vertical" className="flex-1 overflow-hidden">
          <Panel defaultSize={30} minSize={10} maxSize={60} className="flex flex-col overflow-hidden">
            <PagesPanel />
          </Panel>
          <PanelResizeHandle className="group relative z-10 -my-1 h-2 cursor-row-resize">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          </PanelResizeHandle>
          <Panel defaultSize={70} minSize={20} className="flex flex-col overflow-hidden">
            <header
              data-test-id="layers-header"
              className="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface"
            >
              {panels.layers}
            </header>
            <LayerTree data-test-id="layers-tree" />
          </Panel>
        </PanelGroup>
      )}
    </aside>
  )
})

LayersPanel.displayName = 'LayersPanel'
export default LayersPanel
