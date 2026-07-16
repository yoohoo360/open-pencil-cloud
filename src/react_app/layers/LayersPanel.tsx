import { LayerTree } from '@/react_app/layers/LayerTree'
import { AppMenu } from '@/react_app/menus/AppMenu'
import { PagesPanel } from '@/react_app/pages/PagesPanel'
import { useI18n } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

export function LayersPanel({ editor }: { editor: Editor }) {
  const { panels } = useI18n()

  return (
    <aside
      data-test-id="layers-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-panel"
      style={{ contain: 'paint layout style' }}
    >
      <AppMenu editor={editor} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex max-h-[40%] min-h-[80px] flex-col overflow-hidden border-b border-border">
          <PagesPanel editor={editor} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <header
            data-test-id="layers-header"
            className="shrink-0 px-3 py-2 text-[11px] tracking-wider text-muted uppercase"
          >
            {panels.layers}
          </header>
          <LayerTree editor={editor} />
        </div>
      </div>
    </aside>
  )
}
