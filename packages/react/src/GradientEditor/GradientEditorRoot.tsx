import { useState } from 'react'

import { colorToCSS, parseColor } from '@open-pencil/core'

import type { Color, Fill, GradientStop, GradientTransform } from '@open-pencil/core'
import type { ReactNode } from 'react'

type GradientSubtype =
  | 'GRADIENT_LINEAR'
  | 'GRADIENT_RADIAL'
  | 'GRADIENT_ANGULAR'
  | 'GRADIENT_DIAMOND'

const SUBTYPES: { value: GradientSubtype; label: string }[] = [
  { value: 'GRADIENT_LINEAR', label: 'Linear' },
  { value: 'GRADIENT_RADIAL', label: 'Radial' },
  { value: 'GRADIENT_ANGULAR', label: 'Angular' },
  { value: 'GRADIENT_DIAMOND', label: 'Diamond' }
]

const DEFAULT_TRANSFORMS: Record<GradientSubtype, GradientTransform> = {
  GRADIENT_LINEAR: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 },
  GRADIENT_RADIAL: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
  GRADIENT_ANGULAR: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
  GRADIENT_DIAMOND: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 }
}

export interface GradientEditorRootSlotProps {
  stops: GradientStop[]
  subtype: GradientSubtype
  subtypes: { value: GradientSubtype; label: string }[]
  activeStopIndex: number
  activeColor: Color
  barBackground: string
  setSubtype: (type: GradientSubtype) => void
  selectStop: (index: number) => void
  addStop: () => void
  removeStop: (index: number) => void
  updateStopPosition: (index: number, position: number) => void
  updateStopColor: (index: number, hex: string) => void
  updateStopOpacity: (index: number, opacity: number) => void
  updateActiveColor: (color: Color) => void
  dragStop: (index: number, position: number) => void
}

export interface GradientEditorRootProps {
  fill: Fill
  onUpdate?: (fill: Fill) => void
  children?: ReactNode | ((state: GradientEditorRootSlotProps) => ReactNode)
}

export function GradientEditorRoot({ fill, onUpdate, children }: GradientEditorRootProps) {
  const [activeStopIndex, setActiveStopIndex] = useState(0)
  const stops = fill.gradientStops ?? []
  const subtype = fill.type as GradientSubtype

  const activeColor = !stops.length
    ? fill.color
    : stops[Math.min(activeStopIndex, stops.length - 1)].color

  const barBackground = stops.length
    ? `linear-gradient(to right, ${stops.map((s) => `${colorToCSS(s.color)} ${s.position * 100}%`).join(', ')})`
    : ''

  function emitStops(newStops: GradientStop[]) {
    onUpdate?.({ ...fill, gradientStops: newStops })
  }

  function setSubtype(type: GradientSubtype) {
    if (type === fill.type) return
    onUpdate?.({ ...fill, type, gradientTransform: DEFAULT_TRANSFORMS[type] })
  }

  function selectStop(index: number) {
    setActiveStopIndex(index)
  }

  function addStop() {
    const s = [...stops]
    const pos = s.length >= 2 ? (s[s.length - 2].position + s[s.length - 1].position) / 2 : 0.5
    s.push({ color: { ...activeColor }, position: pos })
    s.sort((a, b) => a.position - b.position)
    setActiveStopIndex(s.findIndex((stop) => stop.position === pos))
    emitStops(s)
  }

  function removeStop(index: number) {
    if (stops.length <= 2) return
    emitStops(stops.filter((_, i) => i !== index))
    setActiveStopIndex(Math.min(activeStopIndex, stops.length - 2))
  }

  function updateStopPosition(index: number, position: number) {
    const s = [...stops]
    s[index] = { ...s[index], position: Math.max(0, Math.min(1, position / 100)) }
    emitStops(s)
  }

  function updateStopColor(index: number, hex: string) {
    const color = parseColor(hex.startsWith('#') ? hex : `#${hex}`)
    if (!color) return
    const s = [...stops]
    s[index] = { ...s[index], color: { ...color, a: s[index].color.a } }
    emitStops(s)
  }

  function updateStopOpacity(index: number, opacity: number) {
    const s = [...stops]
    s[index] = {
      ...s[index],
      color: { ...s[index].color, a: Math.max(0, Math.min(1, opacity / 100)) }
    }
    emitStops(s)
  }

  function updateActiveColor(color: Color) {
    const s = [...stops]
    const idx = Math.min(activeStopIndex, s.length - 1)
    s[idx] = { ...s[idx], color }
    emitStops(s)
  }

  function dragStop(index: number, position: number) {
    const s = [...stops]
    s[index] = { ...s[index], position }
    emitStops(s)
  }

  const slot: GradientEditorRootSlotProps = {
    stops,
    subtype,
    subtypes: SUBTYPES,
    activeStopIndex,
    activeColor,
    barBackground,
    setSubtype,
    selectStop,
    addStop,
    removeStop,
    updateStopPosition,
    updateStopColor,
    updateStopOpacity,
    updateActiveColor,
    dragStop
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
