import type { Editor } from '@open-pencil/core/editor'

const NAVIGATION_SETTLE_DELAY_MS = 120

let settleTimer: ReturnType<typeof setTimeout> | null = null
let settleEditor: Editor | null = null

/** Mark active pan/zoom so the renderer defers tiles and reuses scene backing. */
export function markViewportNavigation(editor: Editor, phase: 'pan' | 'zoom') {
  if (settleTimer !== null) {
    clearTimeout(settleTimer)
    settleTimer = null
    settleEditor = null
  }
  editor.setNavigationPhase(phase, performance.now())
}

/** After the last pan/zoom input, briefly settle then return to idle + crisp repaint. */
export function scheduleViewportNavigationSettle(editor: Editor) {
  if (settleTimer !== null) clearTimeout(settleTimer)
  settleEditor = editor
  editor.setNavigationPhase('settling')
  settleTimer = setTimeout(() => {
    settleTimer = null
    const target = settleEditor
    settleEditor = null
    if (!target) return
    target.setNavigationPhase('idle')
    target.requestRepaint()
  }, NAVIGATION_SETTLE_DELAY_MS)
}

export function cancelViewportNavigationSettle() {
  if (settleTimer !== null) {
    clearTimeout(settleTimer)
    settleTimer = null
  }
  const target = settleEditor
  settleEditor = null
  if (target?.state.navigation.phase === 'settling') {
    target.setNavigationPhase('idle')
  }
}
