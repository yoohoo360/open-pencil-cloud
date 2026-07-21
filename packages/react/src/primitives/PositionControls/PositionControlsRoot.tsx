import { MIXED, createNodePropScrubActions } from '#react/controls/node-props/helpers'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { memo, useMemo, type ReactNode } from 'react'

export type PositionControlsRootSlotProps = {
  active: boolean
  isMulti: boolean
  ids: string[]
  xValue: number | typeof MIXED
  yValue: number | typeof MIXED
  wValue: number | typeof MIXED
  hValue: number | typeof MIXED
  rotationValue: number | typeof MIXED
  mixed: typeof MIXED
  actions: {
    updateProp: ReturnType<typeof createNodePropScrubActions>['updateProp']
    commitProp: ReturnType<typeof createNodePropScrubActions>['commitProp']
    align: (axis: 'horizontal' | 'vertical', position: 'min' | 'center' | 'max') => void
    flip: (axis: 'horizontal' | 'vertical') => void
    rotate: (degrees: number) => void
  }
}

export type PositionControlsRootProps = {
  children?: ReactNode | ((props: PositionControlsRootSlotProps) => ReactNode)
}

export const PositionControlsRoot = memo(function PositionControlsRoot({
  children
}: PositionControlsRootProps) {
  const editor = useEditor()
  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  const node = useSceneComputed(() => editor.getSelectedNode() ?? null)
  const isMulti = nodes.length > 1
  const merged = <K extends 'x' | 'y' | 'width' | 'height' | 'rotation'>(key: K) =>
    nodes.length > 0 && nodes.every((item) => item[key] === nodes[0]?.[key])
      ? (nodes[0]?.[key] ?? MIXED)
      : MIXED
  const scrubActions = useMemo(() => createNodePropScrubActions(editor), [editor])
  const ids = useMemo(() => nodes.map((item) => item.id), [nodes])
  const slotProps = useMemo<PositionControlsRootSlotProps>(
    () => ({
      active: node !== null || isMulti,
      isMulti,
      ids,
      xValue: isMulti ? merged('x') : Math.round(node?.x ?? 0),
      yValue: isMulti ? merged('y') : Math.round(node?.y ?? 0),
      wValue: merged('width'),
      hValue: merged('height'),
      rotationValue: isMulti ? merged('rotation') : Math.round(node?.rotation ?? 0),
      mixed: MIXED,
      actions: {
        ...scrubActions,
        align: (axis, position) => editor.alignNodes(ids, axis, position),
        flip: (axis) => editor.flipNodes(ids, axis),
        rotate: (degrees) => editor.rotateNodes(ids, degrees)
      }
    }),
    [editor, ids, isMulti, node, nodes, scrubActions]
  )
  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

PositionControlsRoot.displayName = 'PositionControlsRoot'
