import IconLucideFile from '~icons/lucide/file'
import IconLucidePencil from '~icons/lucide/pencil'
import IconLucideTrash2 from '~icons/lucide/trash-2'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { memo, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { tv } from 'tailwind-variants'

import type { SceneNode } from '@open-pencil/scene-graph'
import {
  PageListRoot,
  useFlatReorderDrag,
  useI18n,
  useInlineRename
} from '@open-pencil/react'
import Tip from '@/components/ui/Tip'
import { useMenuUI } from '@/components/ui/menu'
import pageListTheme from '@/theme/page-list'

type PageItem = Pick<SceneNode, 'id' | 'name' | 'childIds'>

type PageActions = {
  rename: (pageId: string, name: string) => void
  delete: (pageId: string) => void
  move: (pageId: string, index: number) => void
}

type PageRowProps = {
  pg: PageItem
  pages: readonly PageItem[]
  currentPageId: string
  isDivider: (page: Pick<PageItem, 'name' | 'childIds'>) => boolean
  actions: {
    switch: (pageId: string) => void
    rename: (pageId: string, name: string) => void
    delete: (pageId: string) => void
    move: (pageId: string, index: number) => void
  }
  rename: ReturnType<typeof useInlineRename>
  pageReorder: ReturnType<typeof useFlatReorderDrag<PageItem>>
  menuCls: ReturnType<typeof useMenuUI>
  pageMessages: { rename: string; delete: string }
  onStartRename: (pg: PageItem, renamePage: (pageId: string, name: string) => void) => void
  currentPagesRef: MutableRefObject<readonly PageItem[]>
  currentMovePageRef: MutableRefObject<PageActions['move'] | null>
}

const pageListStyles = tv(pageListTheme)

const PageRow = memo(function PageRow({
  pg,
  pages,
  currentPageId,
  isDivider,
  actions,
  rename,
  pageReorder,
  menuCls,
  pageMessages,
  onStartRename,
  currentPagesRef,
  currentMovePageRef
}: PageRowProps) {
  const pageInputRef = useRef<HTMLInputElement>(null)

  const pageDropPosition = useCallback((): 'before' | 'after' | undefined => {
    if (pageReorder.instructionTargetId !== pg.id) return undefined
    if (pageReorder.instruction?.operation === 'reorder-before') return 'before'
    if (pageReorder.instruction?.operation === 'reorder-after') return 'after'
    return undefined
  }, [pageReorder.instruction, pageReorder.instructionTargetId, pg.id])

  const dropPosition = pageDropPosition()
  const styles = pageListStyles({
    active: pg.id === currentPageId,
    dragging: pageReorder.draggingId === pg.id,
    dropPosition
  })

  const setupPageRowRef = useCallback(
    (element: HTMLDivElement | null) => {
      currentPagesRef.current = pages
      currentMovePageRef.current = actions.move
      pageReorder.setupItem(element, () => ({ id: pg.id }))
    },
    [actions.move, currentMovePageRef, currentPagesRef, pageReorder, pages, pg.id]
  )

  useEffect(() => {
    if (rename.editingId === pg.id && pageInputRef.current) {
      void rename.focusInput(pageInputRef.current)
    }
  }, [pg.id, rename, rename.editingId])

  return (
    <ContextMenu.Root modal={false}>
      <ContextMenu.Trigger asChild>
        <div
          ref={setupPageRowRef}
          data-test-id="pages-row"
          className={styles.row()}
          data-page-id={pg.id}
          data-active={pg.id === currentPageId || undefined}
          data-dragging={pageReorder.draggingId === pg.id || undefined}
          data-drop-position={dropPosition}
        >
          {dropPosition === 'before' ? (
            <div
              data-test-id="pages-drop-indicator"
              className={styles.dropIndicator()}
            />
          ) : null}
          {rename.editingId === pg.id ? (
            <div className={styles.renameRow()}>
              <IconLucideFile className={styles.icon()} />
              <input
                ref={pageInputRef}
                data-test-id="pages-item-input"
                className={styles.renameInput()}
                defaultValue={pg.name}
                onBlur={(event) => rename.commit(pg.id, event.currentTarget)}
                onKeyDown={(event) => {
                  event.stopPropagation()
                  rename.onKeydown(event.nativeEvent)
                }}
              />
            </div>
          ) : isDivider(pg) ? (
            <div
              data-test-id="pages-divider"
              className={styles.divider()}
              onDoubleClick={() => onStartRename(pg, actions.rename)}
            >
              <div className={styles.dividerLine()} />
            </div>
          ) : (
            <button
              type="button"
              data-test-id="pages-item"
              className={styles.item()}
              onClick={() => actions.switch(pg.id)}
              onDoubleClick={() => onStartRename(pg, actions.rename)}
            >
              <IconLucideFile className={styles.icon()} />
              <span className={styles.label()}>{pg.name}</span>
            </button>
          )}
          {dropPosition === 'after' ? (
            <div
              data-test-id="pages-drop-indicator"
              className={styles.dropIndicator()}
            />
          ) : null}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuCls.content}>
          <ContextMenu.Item
            data-test-id="pages-context-rename"
            className={menuCls.item}
            onSelect={() => onStartRename(pg, actions.rename)}
          >
            <IconLucidePencil className={menuCls.icon} />
            <span>{pageMessages.rename}</span>
          </ContextMenu.Item>
          <ContextMenu.Item
            data-test-id="pages-context-delete"
            className={menuCls.item}
            disabled={pages.length <= 1}
            onSelect={() => actions.delete(pg.id)}
          >
            <IconLucideTrash2 className={menuCls.icon} />
            <span>{pageMessages.delete}</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
})

PageRow.displayName = 'PageRow'

export const PagesPanel = memo(function PagesPanel() {
  const pageActionsRef = useRef<Pick<PageActions, 'rename'> | null>(null)
  const currentPagesRef = useRef<readonly PageItem[]>([])
  const currentMovePageRef = useRef<PageActions['move'] | null>(null)
  const rename = useInlineRename((id, name) => pageActionsRef.current?.rename(id, name))
  const { panels, pages: pageMessages } = useI18n()
  const menuCls = useMenuUI({
    content: 'min-w-36 shadow-[0_8px_30px_rgb(0_0_0/0.4)]',
    item: 'justify-start gap-2'
  })
  const baseStyles = useMemo(() => pageListStyles(), [])

  const pageReorder = useFlatReorderDrag<PageItem>({
    items: () => currentPagesRef.current,
    onMove: (pageId, index) => currentMovePageRef.current?.(pageId, index)
  })

  const onStartRename = useCallback(
    (pg: PageItem, renamePage: (pageId: string, name: string) => void) => {
      pageActionsRef.current = { rename: renamePage }
      rename.start(pg.id, pg.name)
    },
    [rename]
  )

  return (
    <PageListRoot>
      {({ pages, currentPageId, isDivider, actions }) => (
        <div data-test-id="pages-panel" className={baseStyles.panel()}>
          <div className={baseStyles.header()}>
            <span data-test-id="pages-header" className={baseStyles.title()}>
              {panels.pages}
            </span>
            <Tip label={panels.addPage}>
              <button
                type="button"
                data-test-id="pages-add"
                className={baseStyles.add()}
                onClick={actions.add}
              >
                +
              </button>
            </Tip>
          </div>
          <div className={baseStyles.body()}>
            <div data-test-id="pages-scroll" className={baseStyles.viewport()}>
              {pages.map((pg) => (
                <PageRow
                  key={pg.id}
                  pg={pg}
                  pages={pages}
                  currentPageId={currentPageId}
                  isDivider={isDivider}
                  actions={actions}
                  rename={rename}
                  pageReorder={pageReorder}
                  menuCls={menuCls}
                  pageMessages={pageMessages}
                  onStartRename={onStartRename}
                  currentPagesRef={currentPagesRef}
                  currentMovePageRef={currentMovePageRef}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </PageListRoot>
  )
})

PagesPanel.displayName = 'PagesPanel'
export default PagesPanel
