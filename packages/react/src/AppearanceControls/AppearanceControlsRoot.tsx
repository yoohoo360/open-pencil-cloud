import { useAppearance } from '../controls/useAppearance'

import type { MixedValue } from '../controls/useNodeProps'
import type { SceneNode } from '@open-pencil/core'
import type { ReactNode } from 'react'

export interface AppearanceControlsRootSlotProps {
  node: SceneNode | null
  isMulti: boolean
  active: boolean
  hasCornerRadius: boolean
  independentCorners: MixedValue<boolean>
  cornerRadiusValue: MixedValue<number>
  opacityPercent: MixedValue<number>
  visibilityState: 'visible' | 'hidden' | 'mixed'
  updateProp: (key: string, value: number | string) => void
  commitProp: (key: string, value: number | string, previous: number | string) => void
  toggleVisibility: () => void
  toggleIndependentCorners: () => void
  updateCornerProp: (key: string, value: number) => void
  commitCornerProp: (key: string, value: number, previous: number) => void
}

export interface AppearanceControlsRootProps {
  children?: ReactNode | ((state: AppearanceControlsRootSlotProps) => ReactNode)
}

export function AppearanceControlsRoot({ children }: AppearanceControlsRootProps) {
  const ctx = useAppearance()
  const slot: AppearanceControlsRootSlotProps = {
    node: ctx.node,
    isMulti: ctx.isMulti,
    active: ctx.active,
    hasCornerRadius: ctx.hasCornerRadius,
    independentCorners: ctx.independentCorners as MixedValue<boolean>,
    cornerRadiusValue: ctx.cornerRadiusValue as MixedValue<number>,
    opacityPercent: ctx.opacityPercent as MixedValue<number>,
    visibilityState: ctx.visibilityState,
    updateProp: ctx.updateProp,
    commitProp: ctx.commitProp,
    toggleVisibility: ctx.toggleVisibility,
    toggleIndependentCorners: ctx.toggleIndependentCorners,
    updateCornerProp: ctx.updateCornerProp,
    commitCornerProp: ctx.commitCornerProp
  }
  return <>{typeof children === 'function' ? children(slot) : children}</>
}
