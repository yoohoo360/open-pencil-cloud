import { createContext, useContext } from 'react'

import type { Color } from '@open-pencil/scene-graph/primitives'
import { createColorPickerModel, createOkHCLSliderGradientModel, createOkHCLSliderPreviewModel, createSliderGradientModel, createSliderPreviewModel, dialogMessages, rekaToAppColor, updateAlpha, updateHSBChannel, updateHSLChannel, updateHue, updateRGBChannel } from '@open-pencil/react'
import type { OkHCLControls } from '@open-pencil/react'

type RekaColor = ReturnType<typeof createColorPickerModel>['rekaColor']

export type ColorPickerPanelContext = {
  panels: typeof dialogMessages
  color: Color
  okhcl: OkHCLControls | null
  pickerModel: ReturnType<typeof createColorPickerModel>
  rekaColor: RekaColor
  hslColor: ReturnType<typeof createColorPickerModel>['hsl']
  hsbColor: ReturnType<typeof createColorPickerModel>['hsb']
  rgbColor: ReturnType<typeof createColorPickerModel>['rgb']
  sliderPreview: ReturnType<typeof createSliderPreviewModel>
  sliderGradient: ReturnType<typeof createSliderGradientModel>
  okhclSliderPreview: ReturnType<typeof createOkHCLSliderPreviewModel> | null
  okhclSliderGradient: ReturnType<typeof createOkHCLSliderGradientModel> | null
  fieldOptions: { value: string; label: string }[]
  fieldFormat: string
  isOkHCLFormat: boolean
  onRekaColorUpdate: (colorValue: RekaColor) => void
  setFieldFormat: (value: string) => void
  updateRGBAHue: (value: number) => void
  updateRGBAAlpha: (value: number) => void
  updateRGBChannelValue: (channel: 'r' | 'g' | 'b', value: number) => void
  updateHSLChannelValue: (channel: 'h' | 's' | 'l', value: number) => void
  updateHSBChannelValue: (channel: 'h' | 's' | 'b', value: number) => void
  updateOkHCLChannel: (channel: 'h' | 'c' | 'l' | 'a', value: number) => void
}

export function createColorPickerPanelContext(
  color: Color,
  okhcl: OkHCLControls | null | undefined,
  onUpdate: (color: Color) => void
): ColorPickerPanelContext {
  const resolvedOkhcl = okhcl ?? null
  const pickerModel = createColorPickerModel(color)
  const rekaColor = pickerModel.rekaColor
  const hslColor = pickerModel.hsl
  const hsbColor = pickerModel.hsb
  const rgbColor = pickerModel.rgb
  const sliderPreview = createSliderPreviewModel(pickerModel)
  const sliderGradient = createSliderGradientModel(pickerModel)
  const okhclSliderPreview = resolvedOkhcl?.okhcl
    ? createOkHCLSliderPreviewModel(resolvedOkhcl.okhcl)
    : null
  const okhclSliderGradient = resolvedOkhcl?.okhcl
    ? createOkHCLSliderGradientModel(resolvedOkhcl.okhcl)
    : null
  const fieldFormat = resolvedOkhcl?.fieldFormat ?? 'rgb'
  const isOkHCLFormat = fieldFormat === 'okhcl' && !!resolvedOkhcl

  return {
    panels: dialogMessages,
    color,
    okhcl: resolvedOkhcl,
    pickerModel,
    rekaColor,
    hslColor,
    hsbColor,
    rgbColor,
    sliderPreview,
    sliderGradient,
    okhclSliderPreview,
    okhclSliderGradient,
    fieldOptions: resolvedOkhcl?.fieldOptions ?? [
      { value: 'rgb', label: 'RGB' },
      { value: 'hsl', label: 'HSL' },
      { value: 'hsb', label: 'HSB' }
    ],
    fieldFormat,
    isOkHCLFormat,
    onRekaColorUpdate: (colorValue: RekaColor) => onUpdate(rekaToAppColor(colorValue)),
    setFieldFormat: (value: string) => {
      resolvedOkhcl?.setFieldFormat(value as NonNullable<OkHCLControls>['fieldFormat'])
    },
    updateRGBAHue: (value: number) => onUpdate(updateHue(pickerModel, value)),
    updateRGBAAlpha: (value: number) => onUpdate(updateAlpha(color, value)),
    updateRGBChannelValue: (channel: 'r' | 'g' | 'b', value: number) =>
      onUpdate(updateRGBChannel(color, channel, value)),
    updateHSLChannelValue: (channel: 'h' | 's' | 'l', value: number) =>
      onUpdate(updateHSLChannel(pickerModel, channel, value)),
    updateHSBChannelValue: (channel: 'h' | 's' | 'b', value: number) =>
      onUpdate(updateHSBChannel(pickerModel, channel, value)),
    updateOkHCLChannel: (channel: 'h' | 'c' | 'l' | 'a', value: number) => {
      resolvedOkhcl?.updateOkHCL({ [channel]: value })
    }
  }
}

const ColorPickerPanelReactContext = createContext<ColorPickerPanelContext | null>(null)

export const ColorPickerPanelProvider = ColorPickerPanelReactContext.Provider

export function useColorPickerPanelContext(): ColorPickerPanelContext {
  const ctx = useContext(ColorPickerPanelReactContext)
  if (!ctx) throw new Error('Color picker panel controls must be used within ColorPickerPanel')
  return ctx
}
