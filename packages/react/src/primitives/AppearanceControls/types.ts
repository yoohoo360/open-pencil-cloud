import type { ReactNode } from 'react'
import type { BlendMode, SceneNode } from '@open-pencil/scene-graph'

import type { MixedValue } from '#react/controls/node-props/use'
import type { CornerRadiusKey } from '#react/controls/appearance/types'

export interface AppearanceControlsActions {
  updateProp: (key: string, value: string | number) => void
  commitProp: (key: string, value: string | number, previous: string | number) => void
  setBlendMode: (mode: BlendMode) => void
  toggleVisibility: () => void
  toggleIndependentCorners: () => void
  updateCornerProp: (key: CornerRadiusKey, value: number) => void
  commitCornerProp: (key: CornerRadiusKey, value: number, previous: number) => void
}

export interface AppearanceControlsRootSlotProps {
  node: SceneNode | null
  isMulti: boolean
  active: boolean
  hasCornerRadius: boolean
  independentCorners: MixedValue<boolean>
  showIndependentCorners: boolean
  cornerRadiusValue: MixedValue<number>
  opacityPercent: MixedValue<number>
  blendModeValue: MixedValue<BlendMode>
  visibilityState: 'visible' | 'hidden' | 'mixed'
  actions: AppearanceControlsActions
}

export type AppearanceControlsRootSlots =
  ReactNode | ((props: AppearanceControlsRootSlotProps) => ReactNode)
