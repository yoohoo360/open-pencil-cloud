import type { EditorState } from '@open-pencil/core/editor'

type AutosaveState = EditorState & { autosaveEnabled: boolean }

type AutosaveOptions = {
  state: AutosaveState
  getSavedVersion: () => number
  hasWritableSource: () => boolean
  saveCurrentDocument: () => Promise<void>
}

export function createAutosave({
  state,
  getSavedVersion,
  hasWritableSource,
  saveCurrentDocument
}: AutosaveOptions) {
  let lastVersion = state.sceneVersion
  let timeout: ReturnType<typeof setTimeout> | null = null
  const interval = setInterval(() => {
    if (state.sceneVersion === lastVersion) return
    lastVersion = state.sceneVersion
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(async () => {
      const version = state.sceneVersion
      if (version === getSavedVersion() || !state.autosaveEnabled || !hasWritableSource()) return
      try {
        await saveCurrentDocument()
      } catch (e) {
        console.warn('Autosave failed:', e)
      }
    }, 3000)
  }, 100)

  return {
    disposeAutosave: () => {
      clearInterval(interval)
      if (timeout) clearTimeout(timeout)
    }
  }
}
