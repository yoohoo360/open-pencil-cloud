import type { ConstraintType } from '@open-pencil/scene-graph'
import type { Rect } from '@open-pencil/scene-graph/primitives'

import type { OrigChildState } from '#react/shared/input/types'

function constrainedAxis(
  position: number,
  size: number,
  parentBefore: number,
  parentAfter: number,
  constraint: ConstraintType
): { position: number; size: number } {
  const delta = parentAfter - parentBefore
  if (constraint === 'MAX') return { position: position + delta, size }
  if (constraint === 'CENTER') return { position: position + delta / 2, size }
  if (constraint === 'STRETCH') return { position, size: Math.max(1, size + delta) }
  if (constraint === 'SCALE' && parentBefore > 0) {
    const scale = parentAfter / parentBefore
    return { position: position * scale, size: Math.max(1, size * scale) }
  }
  return { position, size }
}

export function constrainedChildRect(
  child: OrigChildState,
  parentBefore: Pick<Rect, 'width' | 'height'>,
  parentAfter: Pick<Rect, 'width' | 'height'>,
  horizontal: ConstraintType,
  vertical: ConstraintType
): Rect {
  const x = constrainedAxis(child.x, child.width, parentBefore.width, parentAfter.width, horizontal)
  const y = constrainedAxis(
    child.y,
    child.height,
    parentBefore.height,
    parentAfter.height,
    vertical
  )
  return {
    x: Math.round(x.position),
    y: Math.round(y.position),
    width: Math.round(x.size),
    height: Math.round(y.size)
  }
}

export function scaledChildRect(
  child: OrigChildState,
  parentBefore: Pick<Rect, 'width' | 'height'>,
  parentAfter: Pick<Rect, 'width' | 'height'>
): Rect {
  return constrainedChildRect(child, parentBefore, parentAfter, 'SCALE', 'SCALE')
}
