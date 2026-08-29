import { useMemo, useSyncExternalStore } from 'react'

import { useEditor } from '#react/editor/context'

function subscribeToScene(editor: ReturnType<typeof useEditor>, onStoreChange: () => void) {
  const stops = [
    editor.onEditorEvent('render:requested', onStoreChange),
    editor.onEditorEvent('selection:changed', onStoreChange),
    editor.onEditorEvent('page:changed', onStoreChange)
  ]
  return () => {
    for (const stop of stops) stop()
  }
}

function sceneSnapshot(editor: ReturnType<typeof useEditor>) {
  return `${editor.state.sceneVersion}:${[...editor.state.selectedIds].join(',')}:${editor.state.currentPageId}`
}

/**
 * Recomputes a value when the editor scene, selection, or current page change.
 */
export function useSceneComputed<T>(fn: () => T): T {
  const editor = useEditor()
  const version = useSyncExternalStore(
    (onStoreChange) => subscribeToScene(editor, onStoreChange),
    () => sceneSnapshot(editor),
    () => sceneSnapshot(editor)
  )

  return useMemo(fn, [fn, version])
}
