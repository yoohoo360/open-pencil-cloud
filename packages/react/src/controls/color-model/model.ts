import { converter, formatHex } from 'culori'
import type { Hsl, Hsv, Rgb } from 'culori'

import { colorToCSS, okhclToRGBA, rgba255ToColor, rgbaToOkHCL } from '@open-pencil/core/color'
import type { OkHCLColor } from '@open-pencil/core/color'
import type { Fill, Stroke } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import type {
  HSBChannel,
  HSLChannel,
  OkHCLChannel,
  OkHCLSliderGradientModel,
  OkHCLSliderPreviewModel,
  RGBChannel,
  SliderGradientModel,
  SliderPreviewModel
} from '#react/controls/color-model/types'

export type RGBColor = {
  space: 'rgb'
  r: number
  g: number
  b: number
  alpha: number
}

export type HSLColor = {
  space: 'hsl'
  h: number
  s: number
  l: number
  alpha: number
}

export type HSBColor = {
  space: 'hsb'
  h: number
  s: number
  b: number
  alpha: number
}

export type RekaColor = RGBColor | HSLColor | HSBColor

export interface ColorModelValue {
  rekaColor: RekaColor
  rgb: RGBColor
  hsl: HSLColor
  hsb: HSBColor
  okhcl: OkHCLColor
}

const toRgb = converter('rgb')
const toHsl = converter('hsl')
const toHsv = converter('hsv')

const OKHCL_CHROMA_MAX = 0.4
const OKHCL_LIGHTNESS_MID = 0.5
const OKHCL_HUE_PREVIEW_MIN_CHROMA = 0.15
const OKHCL_HUE_PREVIEW_FALLBACK_LIGHTNESS = 0.7

export function createColorModelValue(color: Color, okhcl?: OkHCLColor | null): ColorModelValue {
  const rekaColor = sceneToRekaColor(color)
  return {
    rekaColor,
    rgb: convertToRgb(rekaColor),
    hsl: convertToHsl(rekaColor),
    hsb: convertToHsb(rekaColor),
    okhcl: applyOkHCLPatch(okhcl ?? rgbaToOkHCL(color), {})
  }
}

export function sceneToRekaColor(color: Color): RGBColor {
  return {
    space: 'rgb',
    r: color.r * 255,
    g: color.g * 255,
    b: color.b * 255,
    alpha: color.a
  }
}

export function rekaToSceneColor(color: RekaColor): Color {
  const rgb = convertToRgb(color)
  return rgba255ToColor(rgb.r, rgb.g, rgb.b, rgb.alpha)
}

export function convertToRgb(color: RekaColor): RGBColor {
  if (color.space === 'rgb') return color
  const rgb = toRgb(toCulori(color)) as Rgb
  return {
    space: 'rgb',
    r: (rgb.r ?? 0) * 255,
    g: (rgb.g ?? 0) * 255,
    b: (rgb.b ?? 0) * 255,
    alpha: rgb.alpha ?? color.alpha
  }
}

export function convertToHsl(color: RekaColor): HSLColor {
  if (color.space === 'hsl') return color
  const hsl = toHsl(toCulori(color)) as Hsl
  return {
    space: 'hsl',
    h: hsl.h ?? 0,
    s: (hsl.s ?? 0) * 100,
    l: (hsl.l ?? 0) * 100,
    alpha: hsl.alpha ?? color.alpha
  }
}

export function convertToHsb(color: RekaColor): HSBColor {
  if (color.space === 'hsb') return color
  const hsv = toHsv(toCulori(color)) as Hsv
  return {
    space: 'hsb',
    h: hsv.h ?? 0,
    s: (hsv.s ?? 0) * 100,
    b: (hsv.v ?? 0) * 100,
    alpha: hsv.alpha ?? color.alpha
  }
}

function toCulori(color: RekaColor): Rgb | Hsl | Hsv {
  if (color.space === 'rgb') {
    return {
      mode: 'rgb',
      r: color.r / 255,
      g: color.g / 255,
      b: color.b / 255,
      alpha: color.alpha
    }
  }
  if (color.space === 'hsl') {
    return {
      mode: 'hsl',
      h: color.h,
      s: color.s / 100,
      l: color.l / 100,
      alpha: color.alpha
    }
  }
  return {
    mode: 'hsv',
    h: color.h,
    s: color.s / 100,
    v: color.b / 100,
    alpha: color.alpha
  }
}

export function withHue(model: ColorModelValue, hue: number): Color {
  return rekaToSceneColor({
    ...model.hsb,
    h: normalizeHue(hue),
    s: model.hsb.s === 0 ? 100 : model.hsb.s,
    b: model.hsb.b === 0 ? 100 : model.hsb.b
  })
}

export function withAlpha(color: Color, alpha: number): Color {
  return { ...color, a: clampUnit(alpha) }
}

export function withRGBChannel(color: Color, channel: RGBChannel, value255: number): Color {
  return { ...color, [channel]: clampUnit(value255 / 255) }
}

export function withHSLChannel(model: ColorModelValue, channel: HSLChannel, value: number): Color {
  const next = {
    ...model.hsl,
    [channel]: channel === 'h' ? normalizeHue(value) : clampPercent(value)
  }

  if (channel === 's' && model.hsl.s === 0 && clampPercent(value) > 0) {
    if (model.hsl.l >= 100 || model.hsl.l <= 0) next.l = 50
  }

  return rekaToSceneColor(next)
}

export function withHSBChannel(model: ColorModelValue, channel: HSBChannel, value: number): Color {
  return rekaToSceneColor({
    ...model.hsb,
    [channel]: channel === 'h' ? normalizeHue(value) : clampPercent(value)
  })
}

export function normalizeOkHCLPatch(channel: OkHCLChannel, value: number): Partial<OkHCLColor> {
  switch (channel) {
    case 'h':
      return { h: normalizeHue(value) }
    case 'c':
      return { c: Math.max(0, value) }
    case 'l':
      return { l: clampUnit(value) }
    case 'a':
      return { a: clampUnit(value) }
    default:
      throw new Error('Unsupported OkHCL channel')
  }
}

export function applyOkHCLPatch(color: OkHCLColor, patch: Partial<OkHCLColor>): OkHCLColor {
  return {
    h: normalizeHue(patch.h ?? color.h),
    c: Math.max(0, patch.c ?? color.c),
    l: clampUnit(patch.l ?? color.l),
    a: clampUnit(patch.a ?? color.a ?? 1)
  }
}

export function createSliderPreviewModel(model: ColorModelValue): SliderPreviewModel {
  return {
    hue: rekaToSceneColor({ ...model.hsb, s: 100, b: 100 }),
    hslSaturation: rekaToSceneColor(model.hsl),
    hslLightness: rekaToSceneColor(model.hsl),
    hsbSaturation: rekaToSceneColor(model.hsb),
    hsbBrightness: rekaToSceneColor(model.hsb)
  }
}

export function createOkHCLSliderPreviewModel(color: OkHCLColor): OkHCLSliderPreviewModel {
  return {
    okhclHue: okhclToRGBA({
      ...color,
      c: Math.max(color.c, OKHCL_HUE_PREVIEW_MIN_CHROMA),
      l: color.l <= 0 || color.l >= 1 ? OKHCL_HUE_PREVIEW_FALLBACK_LIGHTNESS : color.l
    }),
    okhclChroma: okhclToRGBA(color),
    okhclLightness: okhclToRGBA(color)
  }
}

export function createSliderGradientModel(model: ColorModelValue): SliderGradientModel {
  const hslGray = rekaToSceneColor({ ...model.hsl, s: 0 })
  const hslColor = rekaToSceneColor({ ...model.hsl, s: 100 })
  const hslBlack = rekaToSceneColor({ ...model.hsl, l: 0 })
  const hslMid = rekaToSceneColor({ ...model.hsl, l: 50 })
  const hslWhite = rekaToSceneColor({ ...model.hsl, l: 100 })
  const hsbGray = rekaToSceneColor({ ...model.hsb, s: 0 })
  const hsbColor = rekaToSceneColor({ ...model.hsb, s: 100 })
  const hsbBlack = rekaToSceneColor({ ...model.hsb, b: 0 })
  const hsbBright = rekaToSceneColor({ ...model.hsb, b: 100 })

  return {
    hslSaturation: gradient(hslGray, hslColor),
    hslLightness: gradient(hslBlack, hslMid, hslWhite),
    hsbSaturation: gradient(hsbGray, hsbColor),
    hsbBrightness: gradient(hsbBlack, hsbBright)
  }
}

export function createOkHCLSliderGradientModel(color: OkHCLColor): OkHCLSliderGradientModel {
  return {
    okhclChroma: gradient(
      okhclToRGBA({ ...color, c: 0 }),
      okhclToRGBA({ ...color, c: OKHCL_CHROMA_MAX })
    ),
    okhclLightness: gradient(
      okhclToRGBA({ ...color, l: 0 }),
      okhclToRGBA({ ...color, l: OKHCL_LIGHTNESS_MID }),
      okhclToRGBA({ ...color, l: 1 })
    )
  }
}

export function colorsEqual(left: Color, right: Color): boolean {
  return left.r === right.r && left.g === right.g && left.b === right.b && left.a === right.a
}

export function okhclPatchChangesColor(color: OkHCLColor, patch: Partial<OkHCLColor>): boolean {
  return Object.entries(patch).some(([key, value]) => color[key as keyof OkHCLColor] !== value)
}

export function applySolidFillColor(fill: Fill, color: Color): Fill {
  return { ...fill, color, opacity: color.a }
}

export function applySolidStrokeColor(color: Color): Partial<Stroke> {
  return { color, opacity: color.a }
}

export function toPercent(value: number): number {
  return Math.round(value * 100)
}

export function fromPercent(value: number): number {
  return clampUnit(value / 100)
}

/** Debug helper kept for parity with previous reka formatting paths. */
export function rekaColorToHex(color: RekaColor): string {
  return formatHex(toCulori(color)) ?? '#000000'
}

function gradient(...colors: Color[]): string {
  return `background: linear-gradient(to right, ${colors.map(colorToCSS).join(', ')});`
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function normalizeHue(value: number): number {
  const hue = value % 360
  return hue < 0 ? hue + 360 : hue
}
