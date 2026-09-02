import { createContext, useContext, type ReactNode } from 'react'

import type { Editor } from '@open-pencil/core/editor'

const EditorReactContext = createContext<Editor | null>(null)

/**
 * Context token kept for parity with the previous Vue SDK public API.
 * Prefer {@link EditorProvider} / {@link useEditor} in React code.
 */
export const EDITOR_KEY = EditorReactContext

/**
 * Provides an OpenPencil editor instance to the current React subtree.
 */
export function EditorProvider({
  editor,
  children
}: {
  editor: Editor
  children: ReactNode
}) {
  return <EditorReactContext.Provider value={editor}>{children}</EditorReactContext.Provider>
}

/** @deprecated Use {@link EditorProvider} */
export function provideEditor(_editor: Editor) {
  throw new Error(
    '[open-pencil] provideEditor() is Vue-only. Wrap your tree with <EditorProvider editor={editor}>.'
  )
}

/**
 * Returns the current editor from React context.
 */
export function useEditor(): Editor {
  const editor = useContext(EditorReactContext)
  if (!editor) {
    throw new Error(
      '[open-pencil] useEditor() called without an editor. ' +
        'Wrap your tree with <EditorProvider editor={editor}> first.'
    )
  }
  return editor
}
