import { useMemo } from 'react'
import { tv } from 'tailwind-variants'
import { Columns2, Rows2, X } from 'lucide-react'

import { useI18n } from '#react/i18n'
import { useEditorStore } from '#react/app/editor/store'
import type { SplitDirection } from '#react/editor/panes/split-tree'
import { IconButton } from '#react/components/ui/IconButton'
import { menuItem, useMenuUI } from '#react/components/ui/menu'
import canvasPaneHeaderTheme from '#react/theme/canvas-pane-header'

export function CanvasPaneHeader({ paneId }: { paneId: string }) {
  const store = useEditorStore()
  const { menu: menuText } = useI18n()
  const pane = store.panes.getPane(paneId)
  const isActive = store.activePaneId === paneId
  const pageId = pane?.currentPageId
  const pageName = pageId ? (store.graph.getNode(pageId)?.name ?? menuText.view) : menuText.view
  const zoom = Math.round((pane?.zoom ?? 1) * 100)
  const canSplit = store.visiblePaneCount < store.panes.maxVisiblePanes
  const canClose = store.visiblePaneCount > 1
  const menuCls = useMenuUI({ content: 'min-w-40' })
  const itemCls = menuItem({ justify: 'start' })
  const headerCls = useMemo(
    () => tv(canvasPaneHeaderTheme)({ active: isActive }),
    [isActive]
  )

  function activatePane() {
    store.setActivePane(paneId)
  }

  function split(direction: SplitDirection) {
    activatePane()
    store.splitPane(paneId, direction)
  }

  return (
    <div
      data-slot="canvas-pane-header"
      data-active={isActive ? 'true' : 'false'}
      className={headerCls.root()}
      onPointerDown={activatePane}
    >
      <span className={headerCls.title()}>{pageName}</span>
      <span className={headerCls.zoom()}>{zoom}%</span>
      <div className={headerCls.actions()}>
        <details className="relative">
          <summary className="list-none [&::-webkit-details-marker]:hidden">
            <IconButton label={`${menuText.splitRight} / ${menuText.splitDown}`} size="xs">
              <Columns2 className={headerCls.icon()} />
            </IconButton>
          </summary>
          <div className={`absolute right-0 z-20 mt-1 ${menuCls.content}`}>
            <button
              type="button"
              disabled={!canSplit}
              className={itemCls}
              onClick={() => split('horizontal')}
            >
              <Columns2 className={menuCls.icon} />
              <span>{menuText.splitRight}</span>
            </button>
            <button
              type="button"
              disabled={!canSplit}
              className={itemCls}
              onClick={() => split('vertical')}
            >
              <Rows2 className={menuCls.icon} />
              <span>{menuText.splitDown}</span>
            </button>
          </div>
        </details>
        <IconButton
          label={menuText.closeView}
          side="bottom"
          size="xs"
          disabled={!canClose}
          onClick={() => store.closePane(paneId)}
        >
          <X className={headerCls.icon()} />
        </IconButton>
      </div>
    </div>
  )
}
