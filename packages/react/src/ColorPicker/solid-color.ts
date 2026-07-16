import type { Color, Fill, Stroke } from '@open-pencil/core'

export function applySolidFillColor(fill: Fill, color: Color): Fill {
  return {
    ...fill,
    color,
    opacity: color.a
  }
}

export function applySolidStrokeColor(color: Color): Partial<Stroke> {
  return {
    color,
    opacity: color.a
  }
}
