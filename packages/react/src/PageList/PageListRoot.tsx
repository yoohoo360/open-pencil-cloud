import type { ReactNode } from 'react'

import { usePageList } from './usePageList'

import type { SceneNode } from '@open-pencil/core'

export interface PageListRootSlotProps {
  pages: SceneNode[]
  currentPageId: string
  isDivider: (page: { name: string; childIds: string[] }) => boolean
  addPage: () => void
  switchPage: (pageId: string) => void
  renamePage: (pageId: string, name: string) => void
  deletePage: (pageId: string) => void
}

export interface PageListRootProps {
  dividerPattern?: RegExp
  onAdd?: () => void
  onSwitch?: (pageId: string) => void
  onRename?: (pageId: string, name: string) => void
  onDelete?: (pageId: string) => void
  children?: ReactNode | ((state: PageListRootSlotProps) => ReactNode)
}

export function PageListRoot({
  dividerPattern: dividerPatternProp,
  onAdd,
  onSwitch,
  onRename,
  onDelete,
  children
}: PageListRootProps) {
  const { pages, currentPageId, switchPage, addPage, renamePage, deletePage } = usePageList()

  const dividerPattern = dividerPatternProp ?? /^[-–—*\s]+$/

  function isDivider(page: { name: string; childIds: string[] }) {
    return page.childIds.length === 0 && dividerPattern.test(page.name)
  }

  const slot: PageListRootSlotProps = {
    pages,
    currentPageId,
    isDivider,
    addPage: () => {
      addPage()
      onAdd?.()
    },
    switchPage: (pageId: string) => {
      switchPage(pageId)
      onSwitch?.(pageId)
    },
    renamePage: (pageId: string, name: string) => {
      renamePage(pageId, name)
      onRename?.(pageId, name)
    },
    deletePage: (pageId: string) => {
      deletePage(pageId)
      onDelete?.(pageId)
    }
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
