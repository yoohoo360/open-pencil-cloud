import { MIXED, useNodeProps, type MixedValue } from '../controls/useNodeProps'

import type { ReactNode } from 'react'

export interface PositionControlsRootSlotProps {
  active: boolean
  isMulti: boolean
  ids: string[]
  xValue: MixedValue<number>
  yValue: MixedValue<number>
  wValue: MixedValue<number>
  hValue: MixedValue<number>
  rotationValue: MixedValue<number>
  mixed: typeof MIXED
  updateProp: (key: string, value: number | string) => void
  commitProp: (key: string, value: number | string, previous: number | string) => void
  align: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void
  flip: (axis: 'horizontal' | 'vertical') => void
  rotate: (degrees: number) => void
}

export interface PositionControlsRootProps {
  children?: ReactNode | ((state: PositionControlsRootSlotProps) => ReactNode)
}

export function PositionControlsRoot({ children }: PositionControlsRootProps) {
  const { updateProp, commitProp, node, nodes, isMulti, active, prop, store } = useNodeProps()

  const xValue = isMulti ? prop('x') : Math.round(node?.x ?? 0)
  const yValue = isMulti ? prop('y') : Math.round(node?.y ?? 0)
  const wValue = prop('width')
  const hValue = prop('height')
  const rotationValue = isMulti ? prop('rotation') : Math.round(node?.rotation ?? 0)
  const ids = nodes.map((n) => n.id)

  function align(axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') {
    store.alignNodes(ids, axis, pos)
  }

  function flip(axis: 'horizontal' | 'vertical') {
    store.flipNodes(ids, axis)
  }

  function rotate(degrees: number) {
    store.rotateNodes(ids, degrees)
  }

  const slot: PositionControlsRootSlotProps = {
    active,
    isMulti,
    ids,
    xValue: xValue as MixedValue<number>,
    yValue: yValue as MixedValue<number>,
    wValue: wValue as MixedValue<number>,
    hValue: hValue as MixedValue<number>,
    rotationValue: rotationValue as MixedValue<number>,
    mixed: MIXED,
    updateProp,
    commitProp,
    align,
    flip,
    rotate
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
