import { useSceneSnapshot } from '../store/useEditorStore'

/**
 * Convenience wrapper for scene-derived state.
 *
 * Replaces Vue `computed(() => { void sceneVersion; return fn() })`.
 * Uses snapshot caching so object/array results stay referentially stable
 * across identical scene keys.
 */
export function useSceneComputed<T>(fn: () => T): T {
  return useSceneSnapshot(() => fn())
}
