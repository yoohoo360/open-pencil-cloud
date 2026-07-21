import {
  createContext,
  useContext,
  useMemo,
  type ReactNode
} from 'react'

import type { Color } from '@open-pencil/scene-graph/primitives'
import {
  useColorModel,
  useI18n,
  type ColorFieldFormat,
  type OkHCLControls
} from '@open-pencil/react'

export interface ColorPickerPanelProviderProps {
  color: Color
  okhcl?: OkHCLControls | null
  onUpdate: (color: Color) => void
  children: ReactNode
}

export type ColorPickerPanelContextValue = {
  panels: ReturnType<typeof useI18n>['panels']
  color: Color
  okhcl: OkHCLControls | null
  rekaColor: ReturnType<typeof useColorModel>['rekaColor']
  hslColor: ReturnType<typeof useColorModel>['hsl']
  hsbColor: ReturnType<typeof useColorModel>['hsb']
  rgbColor: ReturnType<typeof useColorModel>['rgb']
  sliderPreview: ReturnType<typeof useColorModel>['sliderPreview']
  sliderGradient: ReturnType<typeof useColorModel>['sliderGradient']
  okhclSliderPreview: ReturnType<typeof useColorModel>['okhclSliderPreview']
  okhclSliderGradient: ReturnType<typeof useColorModel>['okhclSliderGradient']
  fieldOptions: Array<{ value: ColorFieldFormat; label: string }>
  fieldFormat: ColorFieldFormat
  isOkHCLFormat: boolean
  onRekaColorUpdate: ReturnType<typeof useColorModel>['updateFromReka']
  setFieldFormat: (value: ColorFieldFormat) => void
  updateRGBAHue: ReturnType<typeof useColorModel>['updateHue']
  updateRGBAAlpha: ReturnType<typeof useColorModel>['updateAlpha']
  updateRGBChannelValue: ReturnType<typeof useColorModel>['updateRGBChannel']
  updateHSLChannelValue: ReturnType<typeof useColorModel>['updateHSLChannel']
  updateHSBChannelValue: ReturnType<typeof useColorModel>['updateHSBChannel']
  updateOkHCLChannel: ReturnType<typeof useColorModel>['updateOkHCLChannel']
}

const ColorPickerPanelContext = createContext<ColorPickerPanelContextValue | null>(null)

export function ColorPickerPanelProvider({
  color,
  okhcl = null,
  onUpdate,
  children
}: ColorPickerPanelProviderProps) {
  const { panels } = useI18n()
  const colorModel = useColorModel({
    color,
    okhcl: okhcl?.okhcl,
    format: okhcl?.fieldFormat,
    onUpdate,
    onUpdateOkHCL: okhcl?.updateOkHCL,
    onFormatChange: okhcl?.setFieldFormat
  })
  const fieldOptions = useMemo(
    () =>
      okhcl?.fieldOptions ?? [
        { value: 'rgb' as const, label: panels.colorFormatRgb },
        { value: 'hsl' as const, label: panels.colorFormatHsl },
        { value: 'hsb' as const, label: panels.colorFormatHsb }
      ],
    [okhcl, panels.colorFormatRgb, panels.colorFormatHsl, panels.colorFormatHsb]
  )
  const isOkHCLFormat = colorModel.format === 'okhcl' && Boolean(okhcl)

  const value = useMemo<ColorPickerPanelContextValue>(
    () => ({
      panels,
      color,
      okhcl,
      rekaColor: colorModel.rekaColor,
      hslColor: colorModel.hsl,
      hsbColor: colorModel.hsb,
      rgbColor: colorModel.rgb,
      sliderPreview: colorModel.sliderPreview,
      sliderGradient: colorModel.sliderGradient,
      okhclSliderPreview: colorModel.okhclSliderPreview,
      okhclSliderGradient: colorModel.okhclSliderGradient,
      fieldOptions,
      fieldFormat: colorModel.format,
      isOkHCLFormat,
      onRekaColorUpdate: colorModel.updateFromReka,
      setFieldFormat: colorModel.setFormat,
      updateRGBAHue: colorModel.updateHue,
      updateRGBAAlpha: colorModel.updateAlpha,
      updateRGBChannelValue: colorModel.updateRGBChannel,
      updateHSLChannelValue: colorModel.updateHSLChannel,
      updateHSBChannelValue: colorModel.updateHSBChannel,
      updateOkHCLChannel: colorModel.updateOkHCLChannel
    }),
    [
      panels,
      color,
      okhcl,
      colorModel.rekaColor,
      colorModel.hsl,
      colorModel.hsb,
      colorModel.rgb,
      colorModel.sliderPreview,
      colorModel.sliderGradient,
      colorModel.okhclSliderPreview,
      colorModel.okhclSliderGradient,
      colorModel.format,
      colorModel.updateFromReka,
      colorModel.setFormat,
      colorModel.updateHue,
      colorModel.updateAlpha,
      colorModel.updateRGBChannel,
      colorModel.updateHSLChannel,
      colorModel.updateHSBChannel,
      colorModel.updateOkHCLChannel,
      fieldOptions,
      isOkHCLFormat
    ]
  )

  return (
    <ColorPickerPanelContext.Provider value={value}>{children}</ColorPickerPanelContext.Provider>
  )
}

export function useColorPickerPanelContext(): ColorPickerPanelContextValue {
  const ctx = useContext(ColorPickerPanelContext)
  if (!ctx) throw new Error('Color picker panel controls must be used within ColorPickerPanel')
  return ctx
}
