import { wcagContrast } from 'culori'

import type { Color } from '@open-pencil/scene-graph'

import { BLACK } from '#core/constants'

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 }

function compositeColor(foreground: Color, background: Color): Color {
  const alpha = foreground.a
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
    a: 1
  }
}

export function canvasLabelForeground(background: Color, canvasBackground: Color = WHITE): Color {
  const composited = compositeColor(background, canvasBackground)
  const color = { mode: 'rgb' as const, r: composited.r, g: composited.g, b: composited.b }
  const blackContrast = wcagContrast(color, {
    mode: 'rgb',
    r: BLACK.r,
    g: BLACK.g,
    b: BLACK.b
  })
  const whiteContrast = wcagContrast(color, {
    mode: 'rgb',
    r: WHITE.r,
    g: WHITE.g,
    b: WHITE.b
  })
  return blackContrast >= whiteContrast ? BLACK : WHITE
}
