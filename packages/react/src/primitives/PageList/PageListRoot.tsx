import { memo, useCallback, useMemo, type ReactNode } from 'react'

import { usePageList } from '#react/primitives/PageList/usePageList'

type PageListItem = {
  id: string
  name: string
  childIds: string[]
}

export type PageListActions = {
  add: () => void
  switch: (pageId: string) => void
  rename: (pageId: string, name: string) => void
  delete: (pageId: string) => void
  move: (pageId: string, index: number) => void
}

export type PageListRootSlotProps = {
  pages: PageListItem[]
  currentPageId: string
  isDivider: (page: Pick<PageListItem, 'name' | 'childIds'>) => boolean
  actions: PageListActions
}

export type PageListRootProps = {
  dividerPattern?: RegExp
  children?: ReactNode | ((props: PageListRootSlotProps) => ReactNode)
  onAdd?: () => void
  onSwitch?: (pageId: string) => void
  onRename?: (pageId: string, name: string) => void
  onDelete?: (pageId: string) => void
  onMove?: (pageId: string, index: number) => void
}

const DEFAULT_DIVIDER_PATTERN = /^[-–—*\s]+$/

export const PageListRoot = memo(function PageListRoot({
  dividerPattern = DEFAULT_DIVIDER_PATTERN,
  children,
  onAdd,
  onSwitch,
  onRename,
  onDelete,
  onMove
}: PageListRootProps) {
  const { pages, currentPageId, addPage, switchPage, renamePage, deletePage, movePage } = usePageList()
  const actions = useMemo<PageListActions>(
    () => ({
      add: () => {
        addPage()
        onAdd?.()
      },
      switch: (pageId) => {
        switchPage(pageId)
        onSwitch?.(pageId)
      },
      rename: (pageId, name) => {
        renamePage(pageId, name)
        onRename?.(pageId, name)
      },
      delete: (pageId) => {
        deletePage(pageId)
        onDelete?.(pageId)
      },
      move: (pageId, index) => {
        movePage(pageId, index)
        onMove?.(pageId, index)
      }
    }),
    [addPage, deletePage, movePage, onAdd, onDelete, onMove, onRename, onSwitch, renamePage, switchPage]
  )
  const isDivider = useCallback(
    (page: Pick<PageListItem, 'name' | 'childIds'>) =>
      page.childIds.length === 0 && dividerPattern.test(page.name),
    [dividerPattern]
  )
  const slotProps = useMemo<PageListRootSlotProps>(
    () => ({ pages, currentPageId, isDivider, actions }),
    [actions, currentPageId, isDivider, pages]
  )

  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

PageListRoot.displayName = 'PageListRoot'
