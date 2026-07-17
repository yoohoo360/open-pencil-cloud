import { useEffect, useRef, useState } from 'react'
import { ContextMenuContent, ContextMenuItem, ContextMenuPortal, Root as ContextMenuRoot, ContextMenuTrigger } from '@radix-ui/react-context-menu'

import type { SceneNode } from '@open-pencil/scene-graph'
import { PageListRoot, useFlatReorderDrag, useI18n, useInlineRename } from '@open-pencil/react'

import { Tip } from '@/components/ui/Tip'
import { useMenuUI } from '@/components/ui/menu'

import IconLucideFile from '~icons/lucide/file'
import IconLucidePencil from '~icons/lucide/pencil'
import IconLucideTrash2 from '~icons/lucide/trash-2'

type PageItem = Pick<SceneNode, 'id' | 'name' | 'childIds'>

export default function PagesPanel() {
  const { panels, pages: pageMessages } = useI18n()
  const menuCls = useMenuUI({ content: 'min-w-36 shadow-[0_8px_30px_rgb(0_0_0/0.4)]' })
  return (
    <PageListRoot>
      {({ pages, currentPageId, isDivider, actions }) => (
        <PagesContent
          pages={pages}
          currentPageId={currentPageId}
          isDivider={isDivider}
          actions={actions}
          panels={panels}
          pageMessages={pageMessages}
          menuCls={menuCls}
        />
      )}
    </PageListRoot>
  )
}

interface PagesContentProps {
  pages: SceneNode[]
  currentPageId: string
  isDivider: (page: { name: string; childIds: string[] }) => boolean
  actions: {
    add: () => void
    switch: (pageId: string) => void
    rename: (pageId: string, name: string) => void
    delete: (pageId: string) => void
    move: (pageId: string, index: number) => void
  }
  panels: { pages: string; addPage: string }
  pageMessages: { rename: string; delete: string }
  menuCls: ReturnType<typeof useMenuUI>
}

function PagesContent({ pages, currentPageId, isDivider, actions, panels, pageMessages, menuCls }: PagesContentProps) {
  const rename = useInlineRename((id, name) => actions.rename(id, name))
  const pageInputRef = useRef<HTMLInputElement>(null)
  const [currentPages, setCurrentPages] = useState<readonly PageItem[]>(pages)
  const [currentMovePage, setCurrentMovePage] = useState<((id: string, idx: number) => void) | null>(null)

  const pageReorder = useFlatReorderDrag<PageItem>({
    items: () => currentPages,
    onMove: (pageId, index) => currentMovePage?.(pageId, index)
  })

  useEffect(() => {
    if (pageInputRef.current) {
      void rename.focusInput(pageInputRef.current)
    }
  }, [rename.editingId.value])

  function startRename(pg: PageItem) {
    setCurrentPages(pages)
    setCurrentMovePage(() => actions.move)
    rename.start(pg.id, pg.name)
  }

  function setupPageRowRef(el: HTMLElement | null, pg: PageItem) {
    setCurrentPages(pages)
    setCurrentMovePage(() => actions.move)
    pageReorder.setupItem(el, () => ({ id: pg.id }))
  }

  return (
    <div data-test-id="pages-panel" className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between px-3 py-1.5">
        <span data-test-id="pages-header" className="text-[11px] tracking-wider text-muted uppercase">
          {panels.pages}
        </span>
        <Tip label={panels.addPage}>
          <button
            data-test-id="pages-add"
            className="cursor-pointer rounded border-none bg-transparent px-1 text-base leading-none text-muted hover:bg-hover hover:text-surface"
            onClick={() => actions.add()}
          >
            +
          </button>
        </Tip>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          data-test-id="pages-scroll"
          className="scrollbar-thin h-full overflow-x-hidden overflow-y-auto px-1 pb-1"
        >
          {pages.map((pg) => (
            <ContextMenuRoot key={pg.id} modal={false}>
              <ContextMenuTrigger asChild>
                <div
                  data-test-id="pages-row"
                  ref={(el) => setupPageRowRef(el, pg)}
                  className={`relative cursor-grab active:cursor-grabbing ${pageReorder.draggingId.value === pg.id ? 'opacity-60' : ''}`}
                  data-page-id={pg.id}
                >
                  {pageReorder.instructionTargetId.value === pg.id &&
                    pageReorder.instruction.value?.operation === 'reorder-before' && (
                    <div
                      data-test-id="pages-drop-indicator"
                      className="pointer-events-none absolute inset-x-1 top-0 z-10 h-0.5 rounded-full bg-accent"
                    />
                  )}

                  {rename.editingId.value === pg.id ? (
                    <div className="flex w-full items-center gap-1.5 rounded px-2 py-1">
                      <IconLucideFile className="size-3 shrink-0 opacity-70" />
                      <input
                        ref={pageInputRef}
                        data-test-id="pages-item-input"
                        className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none"
                        defaultValue={pg.name}
                        onBlur={(e) => rename.commit(pg.id, e.nativeEvent)}
                        onKeyDown={(e) => rename.onKeydown(e.nativeEvent)}
                      />
                    </div>
                  ) : (isDivider(pg) ? (
                    <div
                      data-test-id="pages-divider"
                      className="my-1 flex cursor-pointer items-center px-2"
                      onDoubleClick={() => startRename(pg)}
                    >
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  ) : (
                    <button
                      data-test-id="pages-item"
                      className={`flex w-full cursor-pointer items-center gap-1.5 rounded border-none px-2 py-1 text-left text-xs ${
                        pg.id === currentPageId
                          ? 'bg-hover text-surface'
                          : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                      }`}
                      onClick={() => actions.switch(pg.id)}
                      onDoubleClick={() => startRename(pg)}
                    >
                      <IconLucideFile className="size-3 shrink-0" />
                      <span className="truncate">{pg.name}</span>
                    </button>
                  ))}

                  {pageReorder.instructionTargetId.value === pg.id &&
                    pageReorder.instruction.value?.operation === 'reorder-after' && (
                    <div
                      data-test-id="pages-drop-indicator"
                      className="pointer-events-none absolute inset-x-1 bottom-0 z-10 h-0.5 rounded-full bg-accent"
                    />
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuPortal>
                <ContextMenuContent className={menuCls.content} sideOffset={2} align="start">
                  <ContextMenuItem
                    data-test-id="pages-context-rename"
                    className={menuCls.item}
                    onSelect={() => startRename(pg)}
                  >
                    <IconLucidePencil className={menuCls.icon} />
                    <span>{pageMessages.rename}</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    data-test-id="pages-context-delete"
                    className={menuCls.item}
                    disabled={pages.length <= 1}
                    onSelect={() => actions.delete(pg.id)}
                  >
                    <IconLucideTrash2 className={menuCls.icon} />
                    <span>{pageMessages.delete}</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenuPortal>
            </ContextMenuRoot>
          ))}
        </div>
      </div>
    </div>
  )
}
