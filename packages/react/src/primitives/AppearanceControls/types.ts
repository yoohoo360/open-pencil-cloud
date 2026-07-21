import type { CornerGeometryKey } from '#react/controls/appearance/types'
import type { MixedValue } from '#react/controls/node-props/use'
import type { ReactNode } from 'react'

import type { BlendMode, SceneNode } from '@open-pencil/scene-graph'

export interface AppearanceControlsActions {
  updateProp(key: string, value: number): void
  commitProp(key: string, value: number, previous: number): void
  setBlendMode(value: BlendMode): void
  toggleVisibility(): void
  toggleIndependentCorners(): void
  updateCornerProp(key: CornerGeometryKey, value: number): void
  commitCornerProp(key: CornerGeometryKey, value: number, previous: number): void
}

export interface AppearanceControlsRootSlotProps {
  node: SceneNode | null
  isMulti: boolean
  active: boolean
  hasCornerRadius: boolean
  independentCorners: MixedValue<boolean>
  showIndependentCorners: boolean
  cornerRadiusValue: MixedValue<number>
  cornerSmoothingPercent: MixedValue<number>
  opacityPercent: MixedValue<number>
  blendModeValue: MixedValue<BlendMode>
  visibilityState: 'visible' | 'hidden' | 'mixed'
  actions: AppearanceControlsActions
}

export interface AppearanceControlsRootSlots {
  /** Complete selection-derived appearance state and mutation actions. */
  default(props: AppearanceControlsRootSlotProps): ReactNode
}
