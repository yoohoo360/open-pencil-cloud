import type { EditorStore } from '@/app/editor/active-store'
import type { Value } from '@/app/shell/keyboard/types'

export function bindSpaceHandTool(inputFocused: Value<boolean>, store: EditorStore) {
  let toolBeforeSpace: typeof store.state.activeTool | null = null

  function restoreTool() {
    if (toolBeforeSpace === null) return
    store.setTool(toolBeforeSpace)
    toolBeforeSpace = null
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== 'Space') return
    if (inputFocused.value || store.state.editingTextId) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    if (toolBeforeSpace !== null || store.state.activeTool === 'HAND') return
    toolBeforeSpace = store.state.activeTool
    store.setTool('HAND')
  }

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') restoreTool()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', restoreTool)

  return {
    dispose() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', restoreTool)
    },
    resetToolBeforeSpace() {
      toolBeforeSpace = null
    }
  }
}
