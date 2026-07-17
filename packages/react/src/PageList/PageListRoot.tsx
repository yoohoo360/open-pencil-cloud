import { useMemo, type ReactNode } from 'react'

import { useEditor } from '../context/editorContext'
import { useSceneSnapshot } from '../store/useEditorStore'

import type { SceneNode } from '@open-pencil/core'

export interface PageListRootProps {
  dividerPattern?: RegExp
  onAdd?: () => void
  onSwitch?: (pageId: string) => void
  onRename?: (pageId: string, name: string) => void
  onDelete?: (pageId: string) => void
  children: (ctx: {
    pages: SceneNode[]
    currentPageId: string
    isDivider: (page: SceneNode) => boolean
    addPage: () => void
    switchPage: (pageId: string) => void
    renamePage: (pageId: string, name: string) => void
    deletePage: (pageId: string) => void
  }) => ReactNode
}

export function PageListRoot({
  dividerPattern,
  onAdd,
  onSwitch,
  onRename,
  onDelete,
  children
}: PageListRootProps) {
  const editor = useEditor()
  const pages = useSceneSnapshot((e) => e.graph.getPages())
  const currentPageId = useSceneSnapshot((e) => e.state.currentPageId)

  const resolvedPattern = useMemo(
    () => dividerPattern ?? /^[-\u2013\u2014*\s]+$/,
    [dividerPattern]
  )

  function isDivider(page: SceneNode): boolean {
    return page.childIds.length === 0 && resolvedPattern.test(page.name)
  }

  function addPage() {
    editor.addPage()
    onAdd?.()
  }

  function switchPage(pageId: string) {
    editor.switchPage(pageId)
    onSwitch?.(pageId)
  }

  function renamePage(pageId: string, name: string) {
    editor.renamePage(pageId, name)
    onRename?.(pageId, name)
  }

  function deletePage(pageId: string) {
    editor.deletePage(pageId)
    onDelete?.(pageId)
  }

  return (
    <>
      {children({ pages, currentPageId, isDivider, addPage, switchPage, renamePage, deletePage })}
    </>
  )
}

export default PageListRoot
