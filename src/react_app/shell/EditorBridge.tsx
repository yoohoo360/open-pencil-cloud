import { useMemo, type ReactNode } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import {
  EditorProvider,
  createEditorStore,
  type EditorStore as ReactEditorStore
} from '@open-pencil/react'

/**
 * Bridges the Vue app's editor store into React context so islands can call
 * useEditor() against the live instance during the parallel migration.
 *
 * Accepts the app `EditorStore` (spread of core Editor + app modules) — it is
 * structurally compatible with `Editor` for requestRender/state access.
 */
export function EditorBridge({ editor, children }: { editor: Editor; children: ReactNode }) {
  const store = useMemo(() => createEditorStore(editor), [editor])
  return <EditorProvider store={store}>{children}</EditorProvider>
}

export type { ReactEditorStore }
