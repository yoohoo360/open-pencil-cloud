import { useCallback, useMemo, useState } from 'react'

import { colorToCSS, parseColor } from '@open-pencil/core/color'
import type { Fill, GradientStop, GradientTransform } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

export type GradientSubtype =
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

/**
 * Returns gradient-stop state and mutation helpers for a fill.
 *
 * Use this composable for gradient editors that need subtype switching,
 * active-stop selection, stop dragging, and stop color/opacity editing.
 */
export function useGradientStops(fill: Fill, onUpdate: (fill: Fill) => void) {
  const [activeStopIndex, setActiveStopIndex] = useState(0)
  const stops = fill.gradientStops ?? []
  const subtype = fill.type as GradientSubtype
  const activeColor = stops[Math.min(activeStopIndex, stops.length - 1)]?.color ?? fill.color
  const barBackground = useMemo(
    () =>
      stops.length
        ? `linear-gradient(to right, ${stops.map((s) => `${colorToCSS(s.color)} ${s.position * 100}%`).join(', ')})`
        : '',
    [stops]
  )
  const emitStops = useCallback(
    (nextStops: GradientStop[]) => onUpdate({ ...fill, gradientStops: nextStops }),
    [fill, onUpdate]
  )
  const setSubtype = useCallback(
    (type: GradientSubtype) => {
      if (type !== fill.type)
        onUpdate({ ...fill, type, gradientTransform: DEFAULT_TRANSFORMS[type] })
    },
    [fill, onUpdate]
  )
  const selectStop = useCallback((index: number) => setActiveStopIndex(index), [])
  const addStop = useCallback(() => {
    const position =
      stops.length >= 2 ? ((stops.at(-2)?.position ?? 0) + (stops.at(-1)?.position ?? 1)) / 2 : 0.5
    const nextStops = [...stops, { color: { ...activeColor }, position }].sort(
      (left, right) => left.position - right.position
    )
    setActiveStopIndex(nextStops.findIndex((stop) => stop.position === position))
    emitStops(nextStops)
  }, [activeColor, emitStops, stops])
  const removeStop = useCallback(
    (index: number) => {
      if (stops.length <= 2) return
      emitStops(stops.filter((_, stopIndex) => stopIndex !== index))
      setActiveStopIndex(Math.min(activeStopIndex, stops.length - 2))
    },
    [activeStopIndex, emitStops, stops]
  )
  const updateStopPosition = useCallback(
    (index: number, position: number) => {
      const nextStops = [...stops]
      const stop = nextStops[index]
      if (stop) nextStops[index] = { ...stop, position: Math.max(0, Math.min(1, position / 100)) }
      emitStops(nextStops)
    },
    [emitStops, stops]
  )
  const updateActiveColor = useCallback(
    (color: Color) => {
      const nextStops = [...stops]
      const index = Math.min(activeStopIndex, nextStops.length - 1)
      const stop = nextStops[index]
      if (stop) nextStops[index] = { ...stop, color }
      emitStops(nextStops)
    },
    [activeStopIndex, emitStops, stops]
  )
  const updateStopColor = useCallback(
    (index: number, hex: string) => {
      selectStop(index)
      const color = parseColor(hex.startsWith('#') ? hex : `#${hex}`)
      const stop = stops[index]
      if (!stop) return
      const nextStops = [...stops]
      nextStops[index] = { ...stop, color: { ...color, a: stop.color.a } }
      emitStops(nextStops)
    },
    [emitStops, selectStop, stops]
  )
  const updateStopOpacity = useCallback(
    (index: number, opacity: number) => {
      const stop = stops[index]
      if (!stop) return
      const nextStops = [...stops]
      nextStops[index] = {
        ...stop,
        color: { ...stop.color, a: Math.max(0, Math.min(1, opacity / 100)) }
      }
      emitStops(nextStops)
    },
    [emitStops, stops]
  )
  const dragStop = useCallback(
    (index: number, position: number) => {
      const stop = stops[index]
      if (!stop) return
      const nextStops = [...stops]
      nextStops[index] = { ...stop, position }
      emitStops(nextStops)
    },
    [emitStops, stops]
  )

  return useMemo(
    () => ({
      activeStopIndex,
      stops,
      subtype,
      subtypes: SUBTYPES,
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
    }),
    [
      activeColor,
      activeStopIndex,
      addStop,
      barBackground,
      dragStop,
      removeStop,
      setSubtype,
      stops,
      subtype,
      updateActiveColor,
      updateStopColor,
      updateStopOpacity,
      updateStopPosition
    ]
  )
}
