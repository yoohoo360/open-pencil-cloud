import { colorToCSS } from '@open-pencil/core'

import type { Fill, GradientStop } from '@open-pencil/core'

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
 *
 * This hook is useful for fill pickers that switch between solid,
 * gradient, and image modes while keeping a live fill model in sync.
 */
export function useFillPicker(fill: Fill, onUpdate: (fill: Fill) => void) {
  const category: FillCategory = FILL_CATEGORY[fill.type] ?? 'SOLID'

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

  const swatchBg =
    category === 'GRADIENT' && fill.gradientStops?.length
      ? `linear-gradient(to right, ${gradientCSS(fill.gradientStops)})`
      : colorToCSS(fill.color)

  return {
    category,
    swatchBg,
    toSolid,
    toGradient,
    toImage
  }
}
