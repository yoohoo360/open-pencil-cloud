import type { EditorStore } from '#react/app/editor/store'
import { isEditing } from '#react/app/shell/keyboard/focus'
import { isReservedModShortcut } from '#react/app/shell/keyboard/reserved'

const NUDGE_DELTAS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0]
}

export function bindNudgeKeys(store: EditorStore) {
  function onKeyDown(e: KeyboardEvent) {
    if (isEditing(e) || store.state.editingTextId) return
    if (isReservedModShortcut(e)) e.preventDefault()
    if (e.metaKey || e.ctrlKey || e.altKey) return

    const delta = NUDGE_DELTAS[e.code]
    if (!delta || store.state.selectedIds.size === 0) return

    const step = e.shiftKey ? 10 : 1
    store.nudgeSelected(delta[0] * step, delta[1] * step)
    e.preventDefault()
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}
