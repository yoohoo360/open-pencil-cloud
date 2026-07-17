import { type ReactNode } from 'react'
import { colorToCSS, colorToHexRaw } from '@open-pencil/core/color'
import type { GradientStop } from '@open-pencil/scene-graph'

interface GradientEditorStopActions {
  select: () => void
  updatePosition: (position: number) => void
  updateColor: (hex: string) => void
  updateOpacity: (opacity: number) => void
  remove: () => void
}

interface GradientEditorStopSlotProps {
  stop: GradientStop
  index: number
  active: boolean
  positionPercent: number
  opacityPercent: number
  hex: string
  css: string
  actions: GradientEditorStopActions
}

interface GradientEditorStopProps {
  stop: GradientStop
  index: number
  active: boolean
  onSelect?: (index: number) => void
  onUpdatePosition?: (index: number, position: number) => void
  onUpdateColor?: (index: number, hex: string) => void
  onUpdateOpacity?: (index: number, opacity: number) => void
  onRemove?: (index: number) => void
  children?: ReactNode | ((props: GradientEditorStopSlotProps) => ReactNode)
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

  const actions: GradientEditorStopActions = {
    select: () => onSelect?.(index),
    updatePosition: (position: number) => onUpdatePosition?.(index, position),
    updateColor: (hexValue: string) => onUpdateColor?.(index, hexValue),
    updateOpacity: (opacity: number) => onUpdateOpacity?.(index, opacity),
    remove: () => onRemove?.(index)
  }

  const slotProps: GradientEditorStopSlotProps = {
    stop,
    index,
    active,
    positionPercent,
    opacityPercent,
    hex,
    css,
    actions
  }

  return typeof children === 'function' ? <>{children(slotProps)}</> : <>{children}</>
}
