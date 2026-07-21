import { createContext, useContext, type ReactNode } from 'react'

import type { Editor } from '@open-pencil/core/editor'

/**
 * React context for the current OpenPencil editor instance.
 *
 * Most SDK consumers should use {@link EditorProvider} and {@link useEditor}
 * instead of interacting with this context directly.
 */
const EditorContext = createContext<Editor | null>(null)
EditorContext.displayName = 'OpenPencilEditor'

export const EDITOR_KEY = EditorContext

export type EditorProviderProps = {
  editor: Editor
  children?: ReactNode
}

/**
 * Provides an OpenPencil editor instance to the current React subtree.
 *
 * Mount this once near the top of your editor shell so descendant hooks
 * and headless primitives can access the editor with {@link useEditor}.
 */
export function EditorProvider({ editor, children }: EditorProviderProps) {
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}

/** @deprecated Prefer {@link EditorProvider}. */
export function provideEditor(_editor: Editor): never {
  throw new Error(
    '[open-pencil] provideEditor() is Vue-only. Wrap your tree with <EditorProvider editor={editor}> instead.'
  )
}

/**
 * Returns the current OpenPencil editor from React context.
 *
 * Throws if called outside an {@link EditorProvider}.
 */
export function useEditor(): Editor {
  const editor = useContext(EditorContext)
  if (!editor) {
    throw new Error(
      '[open-pencil] useEditor() called without an editor provider. ' +
        'Wrap your tree with <EditorProvider editor={editor}> first.'
    )
  }
  return editor
}
