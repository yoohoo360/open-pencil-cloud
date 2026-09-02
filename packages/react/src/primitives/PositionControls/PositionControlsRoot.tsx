import { type ReactNode } from 'react'

import { MIXED } from '#react/controls/node-props/use'
import { usePosition } from '#react/controls/position/use'
import type { MixedValue } from '#react/controls/node-props/use'

interface PositionControlsActions {
  updateProp: (key: string, value: number) => void
  commitProp: (key: string, value: number, previous: number) => void
  align: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void
  flip: (axis: 'horizontal' | 'vertical') => void
  rotate: (degrees: number) => void
}

interface PositionControlsRootSlotProps {
  active: boolean
  isMulti: boolean
  ids: string[]
  xValue: MixedValue<number>
  yValue: MixedValue<number>
  wValue: MixedValue<number>
  hValue: MixedValue<number>
  rotationValue: MixedValue<number>
  mixed: typeof MIXED
  actions: PositionControlsActions
}

interface PositionControlsRootProps {
  children?: ReactNode | ((props: PositionControlsRootSlotProps) => ReactNode)
}

export function PositionControlsRoot({ children }: PositionControlsRootProps) {
  const {
    active,
    isMulti,
    ids,
    x,
    y,
    width,
    height,
    rotation,
    updateProp,
    commitProp,
    align,
    flip,
    rotate
  } = usePosition()

  const actions: PositionControlsActions = {
    updateProp,
    commitProp,
    align,
    flip,
    rotate
  }

  const slotProps: PositionControlsRootSlotProps = {
    active: active.value,
    isMulti: isMulti.value,
    ids: ids.value,
    xValue: x.value,
    yValue: y.value,
    wValue: width.value,
    hValue: height.value,
    rotationValue: rotation.value,
    mixed: MIXED,
    actions
  }

  return typeof children === 'function' ? <>{children(slotProps)}</> : <>{children}</>
}
