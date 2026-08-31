import { enclosingBuiltinInstance } from '#react/graph/builtin'
import type { HitTestFns } from '#react/shared/input/select'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneNode } from '@open-pencil/scene-graph'

function hostOrHit(editor: Editor, hit: SceneNode | null): SceneNode | null {
  if (!hit) return null
  return enclosingBuiltinInstance(editor.graph, hit.id) ?? hit
}

export function resolveHit(
  cx: number,
  cy: number,
  editor: Editor,
  fns: HitTestFns
): SceneNode | null {
  const titleHit =
    fns.hitTestFrameTitle(cx, cy) ??
    fns.hitTestSectionTitle(cx, cy) ??
    fns.hitTestComponentLabel(cx, cy)
  if (titleHit) return hostOrHit(editor, titleHit)

  const hit = fns.hitTestInScope(cx, cy, false)
  if (hit) return hostOrHit(editor, hit)

  const scopeId = editor.state.enteredContainerId
  if (!scopeId) return null

  if (fns.isInsideContainerBounds(cx, cy, scopeId)) {
    editor.clearSelection()
    return null
  }

  editor.exitContainer()
  const afterExit = fns.hitTestInScope(cx, cy, false)
  if (afterExit) return hostOrHit(editor, afterExit)

  if (editor.state.enteredContainerId) {
    editor.exitContainer()
  }
  return null
}
