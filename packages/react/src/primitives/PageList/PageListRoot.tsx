import { type ReactNode } from 'react'
import type { SceneNode } from '@open-pencil/scene-graph'

import { usePageList } from '#react/primitives/PageList/usePageList'

interface PageListActions {
  add: () => void
  switch: (pageId: string) => void
  rename: (pageId: string, name: string) => void
  delete: (pageId: string) => void
  move: (pageId: string, index: number) => void
}

interface PageListRootSlotProps {
  pages: SceneNode[]
  currentPageId: string
  isDivider: (page: { name: string; childIds: string[] }) => boolean
  actions: PageListActions
}

interface PageListRootProps {
  dividerPattern?: RegExp
  onAdd?: () => void
  onSwitch?: (pageId: string) => void
  onRename?: (pageId: string, name: string) => void
  onDelete?: (pageId: string) => void
  onMove?: (pageId: string, index: number) => void
  children?: ReactNode | ((props: PageListRootSlotProps) => ReactNode)
}

export function PageListRoot({
  dividerPattern: customDividerPattern,
  onAdd,
  onSwitch,
  onRename,
  onDelete,
  onMove,
  children
}: PageListRootProps) {
  const { pages, currentPageId, switchPage, addPage, renamePage, deletePage, movePage } =
    usePageList()

  const dividerPattern = customDividerPattern ?? /^[-–—*\s]+$/

  function isDivider(page: { name: string; childIds: string[] }) {
    return page.childIds.length === 0 && dividerPattern.test(page.name)
  }

  const actions: PageListActions = {
    add: () => {
      addPage()
      onAdd?.()
    },
    switch: (pageId: string) => {
      void switchPage(pageId)
      onSwitch?.(pageId)
    },
    rename: (pageId: string, name: string) => {
      renamePage(pageId, name)
      onRename?.(pageId, name)
    },
    delete: (pageId: string) => {
      deletePage(pageId)
      onDelete?.(pageId)
    },
    move: (pageId: string, index: number) => {
      movePage(pageId, index)
      onMove?.(pageId, index)
    }
  }

  const slotProps: PageListRootSlotProps = {
    pages,
    currentPageId: currentPageId.value,
    isDivider,
    actions
  }

  return typeof children === 'function' ? <>{children(slotProps)}</> : <>{children}</>
}
