import { isConstraintEligible, toggleConstraintPin } from '#react/controls/constraints/model'
import { MIXED } from '#react/controls/node-props/use'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import type {
  ConstraintsControlActions,
  ConstraintsControlRootSlotProps
} from '#react/primitives/ConstraintsControl/types'
import { memo, useCallback, useMemo, type ReactNode } from 'react'

import type { ConstraintType, SceneNode } from '@open-pencil/scene-graph'

export type ConstraintsControlRootProps = {
  children?: ReactNode | ((props: ConstraintsControlRootSlotProps) => ReactNode)
}

export const ConstraintsControlRoot = memo(function ConstraintsControlRoot({
  children
}: ConstraintsControlRootProps) {
  const editor = useEditor()
  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  const isMulti = nodes.length > 1
  const active = nodes.length > 0 && nodes.every((node) => isConstraintEligible(editor.graph, node))
  const merged = useCallback(
    (key: 'horizontalConstraint' | 'verticalConstraint') => {
      const first = nodes[0]?.[key]
      return first !== undefined && nodes.every((node) => node[key] === first)
        ? first
        : MIXED
    },
    [nodes]
  )
  const horizontal = merged('horizontalConstraint')
  const vertical = merged('verticalConstraint')
  const setAxis = useCallback(
    (axis: 'horizontal' | 'vertical', value: ConstraintType) => {
      if (!active) return
      const key = axis === 'horizontal' ? 'horizontalConstraint' : 'verticalConstraint'
      editor.undo.runBatch(`Change ${axis} constraint`, () => {
        for (const node of nodes)
          editor.updateNodeWithUndo(node.id, { [key]: value }, `Change ${axis} constraint`)
      })
    },
    [active, editor, nodes]
  )
  const actions = useMemo<ConstraintsControlActions>(
    () => ({
      setHorizontal: (value) => setAxis('horizontal', value),
      setVertical: (value) => setAxis('vertical', value),
      setCenter: (axis) => setAxis(axis, 'CENTER'),
      togglePin: (axis, edge, additive) =>
        setAxis(
          axis,
          toggleConstraintPin(axis === 'horizontal' ? horizontal : vertical, edge, additive)
        )
    }),
    [horizontal, setAxis, vertical]
  )
  const slotProps = useMemo<ConstraintsControlRootSlotProps>(
    () => ({
      active,
      isMulti,
      horizontal: horizontal as ConstraintsControlRootSlotProps['horizontal'],
      vertical: vertical as ConstraintsControlRootSlotProps['vertical'],
      actions
    }),
    [actions, active, horizontal, isMulti, vertical]
  )
  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

ConstraintsControlRoot.displayName = 'ConstraintsControlRoot'
