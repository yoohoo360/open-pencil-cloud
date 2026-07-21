import { useMemo } from 'react'

import { colorToCSS } from '@open-pencil/core/color'
import type { Fill, GradientStop } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import type { FillActions, FillCategory } from '#react/primitives/Fill/types'

const FILL_CATEGORY: Partial<Record<Fill['type'], FillCategory>> = {
  SOLID: 'SOLID',
  GRADIENT_LINEAR: 'GRADIENT',
  GRADIENT_RADIAL: 'GRADIENT',
  GRADIENT_ANGULAR: 'GRADIENT',
  GRADIENT_DIAMOND: 'GRADIENT',
  IMAGE: 'IMAGE'
}

function effectiveColor(color: Color, opacity: number): Color {
  return { ...color, a: color.a * opacity }
}

function gradientCSS(stops: GradientStop[], opacity: number): string {
  return stops
    .map((stop) => `${colorToCSS(effectiveColor(stop.color, opacity))} ${stop.position * 100}%`)
    .join(', ')
}

export function fillCategory(fill: Fill): FillCategory {
  return FILL_CATEGORY[fill.type] ?? 'SOLID'
}

export function fillIsTransparent(fill: Fill): boolean {
  if (fill.opacity < 1) return true
  if (fillCategory(fill) === 'GRADIENT') {
    return fill.gradientStops?.some((stop) => stop.color.a < 1) ?? fill.color.a < 1
  }
  return fill.color.a < 1
}

export function fillSwatchBackground(fill: Fill): string {
  if (fillCategory(fill) === 'GRADIENT' && fill.gradientStops?.length) {
    return `linear-gradient(to right, ${gradientCSS(fill.gradientStops, fill.opacity)})`
  }
  return colorToCSS(effectiveColor(fill.color, fill.opacity))
}

/** Returns fill metadata and immutable conversion actions. */
export function useFill(fill: Fill, onUpdate: (fill: Fill) => void) {
  return useMemo(() => {
    const category = fillCategory(fill)
    const actions: FillActions = {
      toSolid: () => {
        if (category === 'SOLID') return
        const color = fill.gradientStops?.[0]?.color ?? fill.color
        onUpdate({ ...fill, type: 'SOLID', color: { ...color } })
      },
      toGradient: () => {
        if (category === 'GRADIENT') return
        const gradientStops: GradientStop[] = fill.gradientStops?.length
          ? structuredClone(fill.gradientStops)
          : [
              { color: { ...fill.color }, position: 0 },
              { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 }
            ]
        onUpdate({
          ...fill,
          type: 'GRADIENT_LINEAR',
          gradientStops,
          gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 }
        })
      },
      toImage: () => {
        if (category !== 'IMAGE') onUpdate({ ...fill, type: 'IMAGE' })
      }
    }
    return {
      category,
      swatchBackground: fillSwatchBackground(fill),
      transparent: fillIsTransparent(fill),
      actions,
      ...actions
    }
  }, [fill, onUpdate])
}
