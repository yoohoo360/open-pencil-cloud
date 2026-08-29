import { useState } from 'react'
import { tv } from 'tailwind-variants'

import { useI18n } from '#react/i18n'
import { AppMenu } from '#react/components/Shell/AppMenu'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from '#react/components/ui/splitter'
import splitterTheme from '#react/theme/splitter'
import { AssetsPanel } from '#react/components/assets-panel/AssetsPanel'
import { LayerTree } from '#react/components/LayerTree/LayerTree'
import { PagesPanel } from '#react/components/PagesPanel'

export function LayersPanel() {
  const { menu, panels } = useI18n()
  const [activePanel, setActivePanel] = useState<'file' | 'assets'>('file')
  const panelOptions = [
    { value: 'file', label: menu.file },
    { value: 'assets', label: panels.assets }
  ]
  const splitterStyles = tv(splitterTheme)({ direction: 'vertical' })

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
          options={panelOptions}
          label={panels.layers}
          ui={{ root: 'w-full' }}
          onChange={(value) => {
            if (value === 'file' || value === 'assets') setActivePanel(value)
          }}
          renderOption={(option) => (
            <span
              data-test-id={option.value === 'file' ? 'left-panel-layers-tab' : 'left-panel-assets-tab'}
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
        <SplitterGroup
          id="layers-layout"
          direction="vertical"
          autoSaveId="layers-layout"
          className="flex-1 overflow-hidden"
        >
          <SplitterPanel defaultSize={30} minSize={10} maxSize={60} className="flex flex-col overflow-hidden">
            <PagesPanel />
          </SplitterPanel>
          <SplitterResizeHandle className={splitterStyles.handle()}>
            <div className={splitterStyles.divider()} />
          </SplitterResizeHandle>
          <SplitterPanel defaultSize={70} minSize={20} className="flex flex-col overflow-hidden">
            <header
              data-test-id="layers-header"
              className="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface"
            >
              {panels.layers}
            </header>
            <LayerTree />
          </SplitterPanel>
        </SplitterGroup>
      )}
    </aside>
  )
}
