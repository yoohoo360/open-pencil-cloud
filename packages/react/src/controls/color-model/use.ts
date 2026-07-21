import { useMemo, useState, type MutableRefObject } from 'react'

import { colorToHexRaw, okhclToRGBA, parseColor } from '@open-pencil/core/color'
import type { Color } from '@open-pencil/scene-graph/primitives'

import {
  applyOkHCLPatch,
  colorsEqual,
  createColorModelValue,
  createOkHCLSliderGradientModel,
  createOkHCLSliderPreviewModel,
  createSliderGradientModel,
  createSliderPreviewModel,
  normalizeOkHCLPatch,
  okhclPatchChangesColor,
  rekaToSceneColor,
  withAlpha,
  withHSBChannel,
  withHSLChannel,
  withHue,
  withRGBChannel
} from '#react/controls/color-model/model'
import type {
  ColorFieldFormat,
  HSBChannel,
  HSLChannel,
  OkHCLChannel,
  RGBChannel,
  RekaColorValue,
  UseColorModelOptions
} from '#react/controls/color-model/types'
import { resolveMaybe } from '#react/shared/dom/hooks'

/** Built-in presentation formats understood by the color model. */
export const BUILT_IN_COLOR_FORMATS = ['hex', 'rgb', 'hsl', 'hsb', 'okhcl'] as const

/**
 * Creates reactive color-space values, channel actions, and slider presentation data without
 * requiring an editor context.
 */
export function useColorModel(options: UseColorModelOptions) {
  const [localFormat, setLocalFormat] = useState<ColorFieldFormat>(options.defaultFormat ?? 'rgb')
  const color = useMemo(() => resolveMaybe(options.color), [options.color])
  const sourceOkHCL = useMemo(() => resolveMaybe(options.okhcl), [options.okhcl])
  const value = useMemo(() => createColorModelValue(color, sourceOkHCL), [color, sourceOkHCL])
  const format = useMemo(
    () => resolveMaybe(options.format) ?? localFormat,
    [localFormat, options.format]
  )
  const hex = useMemo(() => colorToHexRaw(color), [color])
  const sliderPreview = useMemo(() => createSliderPreviewModel(value), [value])
  const sliderGradient = useMemo(() => createSliderGradientModel(value), [value])
  const okhclSliderPreview = useMemo(
    () => createOkHCLSliderPreviewModel(value.okhcl),
    [value.okhcl]
  )
  const okhclSliderGradient = useMemo(
    () => createOkHCLSliderGradientModel(value.okhcl),
    [value.okhcl]
  )

  function emitColor(nextColor: Color): Color {
    if (!colorsEqual(color, nextColor)) options.onUpdate?.(nextColor)
    return nextColor
  }

  function updateHex(input: string) {
    const parsed = parseColor(input.startsWith('#') ? input : `#${input}`)
    return emitColor({ ...parsed, a: color.a })
  }

  function setFormat(nextFormat: ColorFieldFormat) {
    if (format === nextFormat) return
    setLocalFormat(nextFormat)
    options.onFormatChange?.(nextFormat)
  }

  function updateFromReka(nextColor: RekaColorValue) {
    return emitColor(rekaToSceneColor(nextColor))
  }

  function updateHue(hue: number) {
    return emitColor(withHue(value, hue))
  }

  function updateAlpha(alpha: number) {
    return emitColor(withAlpha(color, alpha))
  }

  function updateRGBChannel(channel: RGBChannel, channelValue: number) {
    return emitColor(withRGBChannel(color, channel, channelValue))
  }

  function updateHSLChannel(channel: HSLChannel, channelValue: number) {
    return emitColor(withHSLChannel(value, channel, channelValue))
  }

  function updateHSBChannel(channel: HSBChannel, channelValue: number) {
    return emitColor(withHSBChannel(value, channel, channelValue))
  }

  function updateOkHCLChannel(channel: OkHCLChannel, channelValue: number) {
    const patch = normalizeOkHCLPatch(channel, channelValue)
    if (!okhclPatchChangesColor(value.okhcl, patch)) return value.okhcl

    if (options.onUpdateOkHCL) {
      options.onUpdateOkHCL(patch)
      return applyOkHCLPatch(value.okhcl, patch)
    }

    const next = applyOkHCLPatch(value.okhcl, patch)
    emitColor(okhclToRGBA(next))
    return next
  }

  return {
    color,
    format,
    hex,
    rekaColor: value.rekaColor,
    rgb: value.rgb,
    hsl: value.hsl,
    hsb: value.hsb,
    okhcl: value.okhcl,
    sliderPreview,
    sliderGradient,
    okhclSliderPreview,
    okhclSliderGradient,
    setFormat,
    updateColor: emitColor,
    updateHex,
    updateFromReka,
    updateHue,
    updateAlpha,
    updateRGBChannel,
    updateHSLChannel,
    updateHSBChannel,
    updateOkHCLChannel
  }
}
