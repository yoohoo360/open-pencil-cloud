import { useEditorSelector } from '../context/editorContext'

/**
 * Convenience wrapper for scene-derived state.
 * Mirrors the Vue SDK's useSceneComputed as a React hook returning a plain value.
 */
export function useSceneComputed<T>(fn: () => T): T {
  return useEditorSelector(() => fn())
}
