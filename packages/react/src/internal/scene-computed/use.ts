import type { ReactiveRef } from '#react/internal/reactive'
import { computed } from '#react/internal/reactive'
import { useSceneSnapshot } from '#react/editor/store/use'
import { useEditor } from '#react/editor/context'

/**
 * Scene-derived value that re-renders the calling component when sceneVersion /
 * selection / page change. Prefer this over reading editor.state in render for
 * property-panel UI so pan/zoom (renderVersion) does not thrash React.
 */
export function useSceneComputed<T>(fn: () => T): T {
  return useSceneSnapshot(() => fn())
}

/**
 * Non-hook computed box for helper factories. Does not subscribe React — pair
 * with {@link useSceneVersion} / {@link useSceneComputed} in the consuming hook.
 */
export function sceneComputedRef<T>(editor: { state: { sceneVersion: number; selectedIds: unknown; currentPageId: string } }, fn: () => T): ReactiveRef<T> {
  return computed(() => {
    void editor.state.sceneVersion
    void editor.state.selectedIds
    void editor.state.currentPageId
    return fn()
  })
}

/** @deprecated Prefer {@link useSceneComputed} which returns T directly. */
export function useSceneComputedRef<T>(fn: () => T): ReactiveRef<T> {
  const editor = useEditor()
  const value = useSceneComputed(fn)
  return computed(() => {
    void editor.state.sceneVersion
    return value
  })
}
