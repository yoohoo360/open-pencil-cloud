import { useEffect, useMemo, type ReactNode } from 'react'
import { watch } from 'vue'

import {
  EditorProvider,
  createEditorStore,
  type EditorStore as ReactEditorStore
} from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

/**
 * Bridges the Vue app's editor store (same object shape as core Editor) into
 * React context so islands can call useEditor() against the live instance.
 *
 * Also watches Vue-reactive `editor.state` and notifies React subscribers.
 * Core editor methods bump versions via a closed-over requestRender, and some
 * app mutations (e.g. setTool) update state without requestRender — a Vue
 * watch is required for React islands to stay in sync.
 */
export function EditorBridge({ editor, children }: { editor: Editor; children: ReactNode }) {
  const store = useMemo(() => createEditorStore(editor), [editor])

  useEffect(() => {
    const stop = watch(
      () =>
        [
          editor.state.sceneVersion,
          editor.state.renderVersion,
          editor.state.activeTool,
          editor.state.zoom,
          editor.state.currentPageId,
          editor.state.documentName,
          editor.state.selectedIds.size,
          // App chrome fields (present on the Vue EditorStore state object)
          (editor.state as { showRulers?: boolean }).showRulers,
          (editor.state as { showRemoteCursors?: boolean }).showRemoteCursors,
          (editor.state as { actionToast?: string | null }).actionToast
        ] as const,
      () => store.notify(),
      { flush: 'sync' }
    )
    return stop
  }, [editor, store])

  return <EditorProvider store={store}>{children}</EditorProvider>
}

export type { ReactEditorStore }
