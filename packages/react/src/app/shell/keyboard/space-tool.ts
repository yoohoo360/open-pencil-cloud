import type { EditorStore } from '#react/app/editor/store'

export function bindSpaceHandTool(inputFocused: () => boolean, store: EditorStore) {
  let toolBeforeSpace: typeof store.state.activeTool | null = null

  function restoreTool() {
    if (toolBeforeSpace === null) return
    store.setTool(toolBeforeSpace)
    toolBeforeSpace = null
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.code !== 'Space') return
    if (inputFocused() || store.state.editingTextId) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    if (toolBeforeSpace !== null || store.state.activeTool === 'HAND') return
    toolBeforeSpace = store.state.activeTool
    store.setTool('HAND')
  }

  function onKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') restoreTool()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', restoreTool)

  return {
    resetToolBeforeSpace() {
      toolBeforeSpace = null
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', restoreTool)
    }
  }
}
