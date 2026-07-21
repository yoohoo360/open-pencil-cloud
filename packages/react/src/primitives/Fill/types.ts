import type { Fill } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

export type FillCategory = 'SOLID' | 'GRADIENT' | 'IMAGE'

export interface FillActions {
  toSolid: () => void
  toGradient: () => void
  toImage: () => void
}

export interface FillRootSlotProps {
  fill: Fill
  category: FillCategory
  swatchBackground: string
  transparent: boolean
  actions: FillActions
}

/** @deprecated React consumers should pass a render-function child to FillRoot. */
export interface FillRootSlots {
  default?: (props: FillRootSlotProps) => unknown
}

export interface FillSwatchSlotProps {
  fill: Fill
  color: Color
  category: FillCategory
  background: string
  transparent: boolean
}

/** @deprecated React consumers should pass a render-function child to FillSwatch. */
export interface FillSwatchSlots {
  default?: (props: FillSwatchSlotProps) => unknown
}
