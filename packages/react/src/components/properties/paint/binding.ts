import type { BindableValueActions } from '#react/primitives/BindableValue/types'
import type { BindingTarget } from '#react/controls/binding/types'
import type { Color } from '@open-pencil/scene-graph/primitives'

export type PaintBindingKind = 'fills' | 'strokes'

export function paintBindingTargets(
  nodeIds: string[],
  kind: PaintBindingKind,
  index: number
): BindingTarget[] {
  return nodeIds.map((nodeId) => ({ nodeId, path: `${kind}/${index}/color` }))
}

export function applyPaintMutation(
  actions: BindableValueActions<Color>,
  flush: () => void,
  update: () => void
): boolean {
  flush()
  if (!actions.beginMutation('edit')) return false
  update()
  return true
}

export function commitPaintMutation(actions: BindableValueActions<Color>) {
  actions.commitMutation()
}

export function cancelPaintMutation(actions: BindableValueActions<Color>) {
  actions.cancelMutation()
}
