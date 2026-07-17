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
  let timer: ReturnType<typeof setTimeout> | null = null

  const poll = setInterval(() => {
    const version = state.sceneVersion
    if (version === lastVersion) return
    lastVersion = version
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      if (version !== state.sceneVersion) return
      if (state.sceneVersion === getSavedVersion()) return
      if (!state.autosaveEnabled) return
      if (!hasWritableSource()) return
      try {
        await saveCurrentDocument()
      } catch (e) {
        console.warn('Autosave failed:', e)
      }
    }, 3000)
  }, 500)

  return {
    disposeAutosave() {
      clearInterval(poll)
      if (timer) clearTimeout(timer)
    }
  }
}
