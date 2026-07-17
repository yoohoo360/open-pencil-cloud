import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'
import { useEditorStore } from '../store/useEditorStore'

/**
 * Returns reactive page state and page-management actions.
 *
 * Use this hook to build page switchers, page lists, or navigation
 * panels without manually reading the graph in each component.
 */
export function usePageList() {
  const editor = useEditor()

  const pages = useSceneComputed(() => editor.graph.getPages())
  const currentPageId = useEditorStore((e) => e.state.currentPageId)

  return {
    editor,
    pages,
    currentPageId,
    switchPage: editor.switchPage,
    addPage: editor.addPage,
    deletePage: editor.deletePage,
    renamePage: editor.renamePage
  }
}
