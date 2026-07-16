import { colorToCSS, colorToHexRaw } from '@open-pencil/core'

import type { GradientStop } from '@open-pencil/core'
import type { ReactNode } from 'react'

export interface GradientEditorStopSlotProps {
  stop: GradientStop
  index: number
  active: boolean
  positionPercent: number
  opacityPercent: number
  hex: string
  css: string
  select: () => void
  updatePosition: (pos: number) => void
  updateColor: (hex: string) => void
  updateOpacity: (opacity: number) => void
  remove: () => void
}

export interface GradientEditorStopProps {
  stop: GradientStop
  index: number
  active: boolean
  onSelect?: (index: number) => void
  onUpdatePosition?: (index: number, position: number) => void
  onUpdateColor?: (index: number, hex: string) => void
  onUpdateOpacity?: (index: number, opacity: number) => void
  onRemove?: (index: number) => void
  children?: ReactNode | ((state: GradientEditorStopSlotProps) => ReactNode)
}

export function GradientEditorStop({
  stop,
  index,
  active,
  onSelect,
  onUpdatePosition,
  onUpdateColor,
  onUpdateOpacity,
  onRemove,
  children
}: GradientEditorStopProps) {
  const positionPercent = Math.round(stop.position * 100)
  const opacityPercent = Math.round(stop.color.a * 100)
  const hex = colorToHexRaw(stop.color)
  const css = colorToCSS(stop.color)

  const slot: GradientEditorStopSlotProps = {
    stop,
    index,
    active,
    positionPercent,
    opacityPercent,
    hex,
    css,
    select: () => onSelect?.(index),
    updatePosition: (pos: number) => onUpdatePosition?.(index, pos),
    updateColor: (h: string) => onUpdateColor?.(index, h),
    updateOpacity: (o: number) => onUpdateOpacity?.(index, o),
    remove: () => onRemove?.(index)
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
