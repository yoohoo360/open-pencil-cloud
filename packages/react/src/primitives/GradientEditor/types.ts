import type { HTMLAttributes, ReactNode } from 'react'

import type { GradientStop } from '@open-pencil/scene-graph'

export interface GradientEditorStopProps extends HTMLAttributes<HTMLDivElement> {
  stop: GradientStop
  index: number
  active: boolean
  dragging?: boolean
  interactive?: boolean
  removable?: boolean
  positionStep?: number
  label?: string
}

export interface GradientEditorStopActions {
  select: () => void
  updatePosition: (position: number) => void
  updateColor: (hex: string) => void
  updateOpacity: (opacity: number) => void
  remove: () => void
}

export interface GradientEditorStopSlotProps {
  stop: GradientStop
  index: number
  active: boolean
  selected: boolean
  dragging: boolean
  positionPercent: number
  opacityPercent: number
  hex: string
  css: string
  actions: GradientEditorStopActions
}

export interface GradientEditorStopSlots {
  default?: (props: GradientEditorStopSlotProps) => ReactNode
}
