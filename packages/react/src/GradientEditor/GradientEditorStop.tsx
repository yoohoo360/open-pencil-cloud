import { useMemo, type ReactNode } from 'react'

import { colorToCSS, colorToHexRaw } from '@open-pencil/core'

import type { GradientStop } from '@open-pencil/core'

export interface GradientEditorStopProps {
  stop: GradientStop
  index: number
  active: boolean
  onSelect: (index: number) => void
  onUpdatePosition: (index: number, position: number) => void
  onUpdateColor: (index: number, hex: string) => void
  onUpdateOpacity: (index: number, opacity: number) => void
  onRemove: (index: number) => void
  children: (ctx: {
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
  }) => ReactNode
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
  const positionPercent = useMemo(() => Math.round(stop.position * 100), [stop.position])
  const opacityPercent = useMemo(() => Math.round(stop.color.a * 100), [stop.color.a])
  const hex = useMemo(() => colorToHexRaw(stop.color), [stop.color])
  const css = useMemo(() => colorToCSS(stop.color), [stop.color])

  return (
    <>
      {children({
        stop,
        index,
        active,
        positionPercent,
        opacityPercent,
        hex,
        css,
        select: () => onSelect(index),
        updatePosition: (pos) => onUpdatePosition(index, pos),
        updateColor: (h) => onUpdateColor(index, h),
        updateOpacity: (o) => onUpdateOpacity(index, o),
        remove: () => onRemove(index)
      })}
    </>
  )
}

export default GradientEditorStop
