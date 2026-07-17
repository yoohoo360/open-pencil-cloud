import { useMemo } from 'react'

import { colorToCSS } from '@open-pencil/core/color'
import type { Fill, GradientStop } from '@open-pencil/scene-graph'

type FillCategory = 'SOLID' | 'GRADIENT' | 'IMAGE'

const FILL_CATEGORY: Record<string, FillCategory> = {
  SOLID: 'SOLID',
  GRADIENT_LINEAR: 'GRADIENT',
  GRADIENT_RADIAL: 'GRADIENT',
  GRADIENT_ANGULAR: 'GRADIENT',
  GRADIENT_DIAMOND: 'GRADIENT',
  IMAGE: 'IMAGE'
}

function gradientCSS(stops: GradientStop[]): string {
  return stops.map((s) => `${colorToCSS(s.color)} ${s.position * 100}%`).join(', ')
}

/**
 * Returns category and conversion helpers for a single fill value.
 */
export function useFillPicker(fill: Fill, onUpdate: (fill: Fill) => void) {
  const category = FILL_CATEGORY[fill.type] ?? 'SOLID'

  function toSolid() {
    if (category === 'SOLID') return
    const color = fill.gradientStops?.[0]?.color ?? fill.color
    onUpdate({ ...fill, type: 'SOLID', color: { ...color } })
  }

  function toGradient() {
    if (category === 'GRADIENT') return
    const stops: GradientStop[] = fill.gradientStops?.length
      ? fill.gradientStops
      : [
          { color: { ...fill.color }, position: 0 },
          { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 }
        ]
    onUpdate({
      ...fill,
      type: 'GRADIENT_LINEAR',
      gradientStops: stops,
      gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 }
    })
  }

  function toImage() {
    if (category === 'IMAGE') return
    onUpdate({ ...fill, type: 'IMAGE' })
  }

  const swatchBg = useMemo(() => {
    if (category === 'GRADIENT' && fill.gradientStops?.length)
      return `linear-gradient(to right, ${gradientCSS(fill.gradientStops)})`
    return colorToCSS(fill.color)
  }, [category, fill])

  return {
    category,
    swatchBg,
    toSolid,
    toGradient,
    toImage
  }
}
