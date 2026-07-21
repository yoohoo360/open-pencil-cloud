import { useMemo } from 'react'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Returns reactive page state and page-management actions.
 *
 * Use this composable to build page switchers, page lists, or navigation
 * panels without manually reading the graph in each component.
 */
export function usePageList() {
  const editor = useEditor()

  const pages = useSceneComputed(() => editor.graph.getPages())
  const currentPageId = useSceneComputed(() => editor.state.currentPageId)

  return useMemo(
    () => ({
      editor,
      pages,
      currentPageId,
      switchPage: editor.switchPage,
      addPage: editor.addPage,
      deletePage: editor.deletePage,
      movePage: editor.movePage,
      renamePage: editor.renamePage
    }),
    [currentPageId, editor, pages]
  )
}
