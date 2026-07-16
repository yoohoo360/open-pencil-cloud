import { useEditor, useEditorVersion } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'

/**
 * Returns reactive page state and page-management actions.
 */
export function usePageList() {
  const editor = useEditor()
  useEditorVersion()

  const pages = useSceneComputed(() => editor.graph.getPages())
  const currentPageId = editor.state.currentPageId

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
