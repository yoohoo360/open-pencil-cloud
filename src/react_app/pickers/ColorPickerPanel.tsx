import { ColorArea } from '@/react_app/pickers/ColorArea'
import { PickerSlider } from '@/react_app/pickers/PickerSlider'
import { AppSelect } from '@/react_app/ui/AppSelect'
import { colorToCSS } from '@open-pencil/core'
import {
  createColorPickerModel,
  createOkHCLSliderGradientModel,
  createOkHCLSliderPreviewModel,
  createSliderGradientModel,
  createSliderPreviewModel,
  fromPercent,
  toPercent,
  updateAlpha,
  updateHSBChannel,
  updateHSLChannel,
  updateHue,
  updateRGBChannel,
  useI18n,
  type OkHCLControls
} from '@open-pencil/react'

import type { Color } from '@open-pencil/core'

export function ColorPickerPanel({
  color,
  okhcl = null,
  onUpdate
}: {
  color: Color
  okhcl?: OkHCLControls | null
  onUpdate: (color: Color) => void
}) {
  const { panels } = useI18n()
  const pickerModel = createColorPickerModel(color)
  const { hsl: hslColor, hsb: hsbColor, rgb: rgbColor } = pickerModel
  const sliderPreview = createSliderPreviewModel(pickerModel)
  const sliderGradient = createSliderGradientModel(pickerModel)
  const okhclSliderPreview = okhcl?.okhcl ? createOkHCLSliderPreviewModel(okhcl.okhcl) : null
  const okhclSliderGradient = okhcl?.okhcl ? createOkHCLSliderGradientModel(okhcl.okhcl) : null
  const fieldOptions = okhcl?.fieldOptions ?? [
    { value: 'rgb', label: panels.colorFormatRgb },
    { value: 'hsl', label: panels.colorFormatHsl },
    { value: 'hsb', label: panels.colorFormatHsb }
  ]
  const fieldFormat = okhcl?.fieldFormat ?? 'rgb'
  const isOkHCLFormat = fieldFormat === 'okhcl' && okhcl

  return (
    <div className="flex flex-col gap-2">
      <ColorArea
        hue={hsbColor.h}
        saturation={hsbColor.s}
        brightness={hsbColor.b}
        alpha={color.a}
        onChange={onUpdate}
      />

      {fieldFormat !== 'okhcl' ? (
        <>
          <PickerSlider
            label="H"
            value={hslColor.h ?? 0}
            min={0}
            max={360}
            step={1}
            gradientStyle="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
            thumbFill={colorToCSS(sliderPreview.hue)}
            ui={{ root: 'gap-0', label: 'hidden', input: 'hidden' }}
            testId="color-slider-hue"
            onValueChange={(v) => onUpdate(updateHue(pickerModel, v))}
          />
          <PickerSlider
            label="A"
            value={color.a}
            min={0}
            max={1}
            step={0.001}
            checkerboard
            gradientStyle={`background: linear-gradient(to right, transparent, ${colorToCSS({ ...color, a: 1 })})`}
            thumbFill={colorToCSS(color)}
            ui={{ root: 'gap-0', label: 'hidden', input: 'hidden' }}
            testId="color-slider-alpha"
            onValueChange={(v) => onUpdate(updateAlpha(color, v))}
          />
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        <AppSelect
          className="w-[120px]"
          testId="color-format-select"
          value={fieldFormat}
          options={fieldOptions}
          onValueChange={(v) => okhcl?.setFieldFormat(v as OkHCLControls['fieldFormat'])}
        />

        <div className="flex min-w-0 flex-col gap-2">
          {fieldFormat === 'rgb' ? (
            <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
              {(['r', 'g', 'b'] as const).map((ch) => (
                <input
                  key={ch}
                  type="number"
                  className="bg-input px-2 py-1 text-xs text-surface outline-none"
                  value={Math.round(rgbColor[ch])}
                  min={0}
                  max={255}
                  onChange={(e) => onUpdate(updateRGBChannel(color, ch, +e.currentTarget.value))}
                />
              ))}
            </div>
          ) : null}

          {fieldFormat === 'hsl' ? (
            <>
              <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
                {(['h', 's', 'l'] as const).map((ch) => (
                  <input
                    key={ch}
                    type="number"
                    className="bg-input px-2 py-1 text-xs text-surface outline-none"
                    value={Math.round(hslColor[ch] ?? 0)}
                    min={0}
                    max={ch === 'h' ? 360 : 100}
                    onChange={(e) =>
                      onUpdate(updateHSLChannel(pickerModel, ch, +e.currentTarget.value))
                    }
                  />
                ))}
              </div>
              <PickerSlider
                label="S"
                value={hslColor.s ?? 0}
                min={0}
                max={100}
                step={0.1}
                displayValue={Math.round(hslColor.s ?? 0)}
                displayMin={0}
                displayMax={100}
                displayStep={1}
                gradientStyle={sliderGradient.hslSaturation}
                thumbFill={colorToCSS(sliderPreview.hslSaturation)}
                testId="color-slider-hsl-s"
                onValueChange={(v) => onUpdate(updateHSLChannel(pickerModel, 's', v))}
              />
              <PickerSlider
                label="L"
                value={hslColor.l ?? 0}
                min={0}
                max={100}
                step={0.1}
                displayValue={Math.round(hslColor.l ?? 0)}
                displayMin={0}
                displayMax={100}
                displayStep={1}
                gradientStyle={sliderGradient.hslLightness}
                thumbFill={colorToCSS(sliderPreview.hslLightness)}
                testId="color-slider-hsl-l"
                onValueChange={(v) => onUpdate(updateHSLChannel(pickerModel, 'l', v))}
              />
              <p className="text-[10px] leading-4 text-muted">{panels.colorHintHsl}</p>
            </>
          ) : null}

          {fieldFormat === 'hsb' ? (
            <>
              <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
                {(['h', 's', 'b'] as const).map((ch) => (
                  <input
                    key={ch}
                    type="number"
                    className="bg-input px-2 py-1 text-xs text-surface outline-none"
                    value={Math.round(hsbColor[ch])}
                    min={0}
                    max={ch === 'h' ? 360 : 100}
                    onChange={(e) =>
                      onUpdate(updateHSBChannel(pickerModel, ch, +e.currentTarget.value))
                    }
                  />
                ))}
              </div>
              <PickerSlider
                label="S"
                value={hsbColor.s}
                min={0}
                max={100}
                step={0.1}
                displayValue={Math.round(hsbColor.s)}
                displayMin={0}
                displayMax={100}
                displayStep={1}
                gradientStyle={sliderGradient.hsbSaturation}
                thumbFill={colorToCSS(sliderPreview.hsbSaturation)}
                testId="color-slider-hsb-s"
                onValueChange={(v) => onUpdate(updateHSBChannel(pickerModel, 's', v))}
              />
              <PickerSlider
                label="B"
                value={hsbColor.b}
                min={0}
                max={100}
                step={0.1}
                displayValue={Math.round(hsbColor.b)}
                displayMin={0}
                displayMax={100}
                displayStep={1}
                gradientStyle={sliderGradient.hsbBrightness}
                thumbFill={colorToCSS(sliderPreview.hsbBrightness)}
                testId="color-slider-hsb-b"
                onValueChange={(v) => onUpdate(updateHSBChannel(pickerModel, 'b', v))}
              />
              <p className="text-[10px] leading-4 text-muted">{panels.colorHintHsb}</p>
            </>
          ) : null}

          {isOkHCLFormat && okhcl?.okhcl ? (
            <div className="flex flex-col gap-2">
              <PickerSlider
                label="H"
                value={okhcl.okhcl.h}
                min={0}
                max={360}
                step={1}
                displayValue={Math.round(okhcl.okhcl.h)}
                displayMin={0}
                displayMax={360}
                displayStep={1}
                gradientStyle="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
                thumbFill={colorToCSS(okhclSliderPreview?.okhclHue ?? color)}
                testId="color-slider-okhcl-h"
                onValueChange={(v) => okhcl.updateOkHCL({ h: v })}
              />
              <PickerSlider
                label="C"
                value={okhcl.okhcl.c}
                min={0}
                max={0.4}
                step={0.001}
                displayValue={toPercent(okhcl.okhcl.c)}
                displayMin={0}
                displayMax={40}
                displayStep={1}
                parseDisplay={fromPercent}
                gradientStyle={okhclSliderGradient?.okhclChroma}
                thumbFill={colorToCSS(okhclSliderPreview?.okhclChroma ?? color)}
                testId="color-slider-okhcl-c"
                onValueChange={(v) => okhcl.updateOkHCL({ c: v })}
              />
              <PickerSlider
                label="L"
                value={okhcl.okhcl.l}
                min={0}
                max={1}
                step={0.001}
                displayValue={toPercent(okhcl.okhcl.l)}
                displayMin={0}
                displayMax={100}
                displayStep={1}
                parseDisplay={fromPercent}
                gradientStyle={okhclSliderGradient?.okhclLightness}
                thumbFill={colorToCSS(okhclSliderPreview?.okhclLightness ?? color)}
                testId="color-slider-okhcl-l"
                onValueChange={(v) => okhcl.updateOkHCL({ l: v })}
              />
              <PickerSlider
                label="A"
                value={okhcl.okhcl.a ?? 1}
                min={0}
                max={1}
                step={0.001}
                displayValue={toPercent(okhcl.okhcl.a ?? 1)}
                displayMin={0}
                displayMax={100}
                displayStep={1}
                parseDisplay={fromPercent}
                checkerboard
                gradientStyle={`background: linear-gradient(to right, transparent, ${colorToCSS(color)})`}
                thumbFill={colorToCSS(color)}
                testId="color-slider-okhcl-a"
                onValueChange={(v) => okhcl.updateOkHCL({ a: v })}
              />
              <div className="flex items-start justify-between gap-2 text-[10px] text-muted">
                <p className="min-w-0 flex-1 leading-4 break-words">{panels.colorHintOkhcl}</p>
                {okhcl.previewColorSpace ? (
                  <span className="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] uppercase">
                    {okhcl.previewColorSpace}
                  </span>
                ) : null}
              </div>
              {okhcl.clipped ? (
                <p className="text-[10px] leading-4 text-amber-400">
                  {panels.colorPreviewClipped({ space: okhcl.previewColorSpace ?? 'display-p3' })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
