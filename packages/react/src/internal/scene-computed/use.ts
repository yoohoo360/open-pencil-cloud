import { useMemo, useSyncExternalStore } from 'react'

import { useEditor } from '#react/editor/context'

/**
 * Convenience wrapper for scene-derived memoized state.
 *
 * Recomputes when sceneVersion / selection / current page change.
 */
export function useSceneComputed<T>(fn: () => T): T {
  const editor = useEditor()

  const version = useSyncExternalStore(
    (onStoreChange) => {
      const stops = [
        editor.onEditorEvent('render:requested', onStoreChange),
        editor.onEditorEvent('selection:changed', onStoreChange),
        editor.onEditorEvent('page:changed', onStoreChange)
      ]
      return () => {
        for (const stop of stops) stop()
      }
    },
    () =>
      `${editor.state.sceneVersion}:${[...editor.state.selectedIds].join(',')}:${editor.state.currentPageId}`
  )

  return useMemo(() => {
    void version
    return fn()
  }, [version, fn])
}
