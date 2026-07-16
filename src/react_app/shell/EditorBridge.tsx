import { useEffect, useMemo, type ReactNode } from 'react'

import { subscribeEditorUI } from '@/stores/editor-notify'
import {
  EditorProvider,
  createEditorStore,
  type EditorStore as ReactEditorStore
} from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

/**
 * Bridges the app editor store (same object shape as core Editor) into
 * React context so islands can call useEditor() against the live instance.
 *
 * Subscribes to the framework-agnostic UI bus (see editor-notify) so chrome
 * mutations that do not go through requestRender still refresh React.
 */
export function EditorBridge({ editor, children }: { editor: Editor; children: ReactNode }) {
  const store = useMemo(() => createEditorStore(editor), [editor])

  useEffect(() => subscribeEditorUI(() => store.notify()), [store])

  return <EditorProvider store={store}>{children}</EditorProvider>
}

export type { ReactEditorStore }
