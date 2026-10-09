import { resolveHostedSelection } from '#react/hosted-components'
import type { HitTestFns } from '#react/shared/input/select'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneNode } from '@open-pencil/scene-graph'

function hostOrHit(editor: Editor, hit: SceneNode | null): SceneNode | null {
  if (!hit) return null
  return resolveHostedSelection(editor.graph, hit)
}

/** The layer a press selects; `deep` (Cmd or Ctrl held) reaches the deepest layer, as in Figma. */
export function resolveHit(
  cx: number,
  cy: number,
  editor: Editor,
  fns: HitTestFns,
  deep = false
): SceneNode | null {
  // Labels are drawn frames first, then sections, then components, so the topmost is tested first.
  const titleHit =
    fns.hitTestComponentLabel(cx, cy) ??
    fns.hitTestSectionTitle(cx, cy) ??
    fns.hitTestFrameTitle(cx, cy)
  if (titleHit) return hostOrHit(editor, titleHit)

  const hit = fns.hitTestInScope(cx, cy, deep)
  if (hit) return hostOrHit(editor, hit)

  const scopeId = editor.state.enteredContainerId
  if (!scopeId) return null

  if (fns.isInsideContainerBounds(cx, cy, scopeId)) {
    editor.clearSelection()
    return null
  }

  editor.exitContainer()
  const afterExit = fns.hitTestInScope(cx, cy, deep)
  if (afterExit) return hostOrHit(editor, afterExit)

  if (editor.state.enteredContainerId) {
    editor.exitContainer()
  }
  return null
}
