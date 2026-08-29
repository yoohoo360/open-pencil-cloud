import { createContext, useContext, type Context, type ReactNode } from 'react'

import type { Editor } from '@open-pencil/core/editor'

/**
 * React context for the current OpenPencil editor instance.
 *
 * Most SDK consumers should wrap a subtree with {@link OpenPencilProvider}
 * and read the editor with {@link useEditor}.
 */
export const EDITOR_KEY: Context<Editor | null> = createContext<Editor | null>(null)

export type OpenPencilProviderProps = {
  editor: Editor
  children?: ReactNode
}

/**
 * Provides an OpenPencil editor instance to the current React subtree.
 *
 * Wrap this once near the top of your editor shell so descendant hooks and
 * headless primitives can access the editor with {@link useEditor}.
 */
export function OpenPencilProvider({ editor, children }: OpenPencilProviderProps) {
  return <EDITOR_KEY.Provider value={editor}>{children}</EDITOR_KEY.Provider>
}

/**
 * Returns the current OpenPencil editor from React context.
 *
 * Throws if called outside a subtree wrapped by {@link OpenPencilProvider}.
 */
export function useEditor(): Editor {
  const editor = useContext(EDITOR_KEY)
  if (!editor) {
    throw new Error(
      '[open-pencil] useEditor() called without an editor. ' +
        'Wrap your subtree with <OpenPencilProvider editor={editor}> first.'
    )
  }
  return editor
}
