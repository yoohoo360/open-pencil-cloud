import type { EditorStore } from '@/app/editor/active-store'

export function bindSpaceHandTool(
  inputFocused: { value: boolean },
  store: EditorStore
): { resetToolBeforeSpace: () => void; dispose: () => void } {
  let toolBeforeSpace: typeof store.state.activeTool | null = null

  function restoreTool() {
    if (toolBeforeSpace === null) return
    store.setTool(toolBeforeSpace)
    toolBeforeSpace = null
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.code !== 'Space') return
    if (inputFocused.value || store.state.editingTextId) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    if (toolBeforeSpace !== null || store.state.activeTool === 'HAND') return
    toolBeforeSpace = store.state.activeTool
    store.setTool('HAND')
  }

  function onKeyup(event: KeyboardEvent) {
    if (event.code === 'Space') restoreTool()
  }

  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('blur', restoreTool)

  return {
    resetToolBeforeSpace() {
      toolBeforeSpace = null
    },
    dispose() {
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('keyup', onKeyup)
      window.removeEventListener('blur', restoreTool)
    }
  }
}
