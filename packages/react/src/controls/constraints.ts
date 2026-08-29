import type { ConstraintType, SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { MIXED, type MixedValue } from '#react/controls/mixed'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export type ConstraintAxis = 'horizontal' | 'vertical'
export type ConstraintEdge = 'leading' | 'trailing'
export type ConstraintValue = MixedValue<ConstraintType>

const CONSTRAINT_PARENT_TYPES = new Set<SceneNode['type']>([
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])

export function isConstraintEligible(graph: SceneGraph, node: SceneNode): boolean {
  if (node.type === 'GROUP' || !node.parentId) return false
  const parent = graph.getNode(node.parentId)
  if (!parent || !CONSTRAINT_PARENT_TYPES.has(parent.type)) return false
  return parent.layoutMode === 'NONE' || node.layoutPositioning === 'ABSOLUTE'
}

export function constraintPins(value: ConstraintValue): {
  leading: boolean
  trailing: boolean
  center: boolean
  scale: boolean
} {
  return {
    leading: value === 'MIN' || value === 'STRETCH',
    trailing: value === 'MAX' || value === 'STRETCH',
    center: value === 'CENTER',
    scale: value === 'SCALE'
  }
}

export function toggleConstraintPin(
  value: ConstraintValue,
  edge: ConstraintEdge,
  additive: boolean
): ConstraintType {
  if (!additive) return edge === 'leading' ? 'MIN' : 'MAX'
  const pins = constraintPins(value)
  const leading = edge === 'leading' ? !pins.leading : pins.leading
  const trailing = edge === 'trailing' ? !pins.trailing : pins.trailing
  if (leading && trailing) return 'STRETCH'
  if (leading) return 'MIN'
  if (trailing) return 'MAX'
  return 'CENTER'
}

function mergedConstraint(
  nodes: readonly SceneNode[],
  key: 'horizontalConstraint' | 'verticalConstraint'
): ConstraintValue {
  if (nodes.length === 0) return MIXED
  const firstValue = nodes[0][key]
  return nodes.some((node) => node[key] !== firstValue) ? MIXED : firstValue
}

export function useConstraints() {
  const editor = useEditor()
  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  const active = useSceneComputed(
    () => nodes.length > 0 && nodes.every((node) => isConstraintEligible(editor.graph, node))
  )
  const horizontal = mergedConstraint(nodes, 'horizontalConstraint')
  const vertical = mergedConstraint(nodes, 'verticalConstraint')

  function setAxis(axis: ConstraintAxis, value: ConstraintType) {
    if (!active) return
    const key = axis === 'horizontal' ? 'horizontalConstraint' : 'verticalConstraint'
    const apply = () => {
      for (const node of nodes) {
        editor.updateNodeWithUndo(node.id, { [key]: value }, `Change ${axis} constraint`)
      }
    }
    if (nodes.length > 1) editor.undo.runBatch(`Change ${axis} constraint`, apply)
    else apply()
  }

  function togglePin(axis: ConstraintAxis, edge: ConstraintEdge, additive: boolean) {
    const current = axis === 'horizontal' ? horizontal : vertical
    setAxis(axis, toggleConstraintPin(current, edge, additive))
  }

  return {
    active,
    isMulti: nodes.length > 1,
    horizontal,
    vertical,
    setAxis,
    togglePin,
    setHorizontal: (value: ConstraintType) => setAxis('horizontal', value),
    setVertical: (value: ConstraintType) => setAxis('vertical', value),
    setCenter: (axis: ConstraintAxis) => setAxis(axis, 'CENTER')
  }
}
