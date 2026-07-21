import { colorToCSS } from '@open-pencil/core/color'
import { fromPercent, toPercent } from '@open-pencil/react'
import { memo } from 'react'

import OkhclChannelSlider from '@/components/color-picker-panel/OkhclChannelSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

const percentText = (value: number) => `${Math.round(toPercent(value))}%`

export const OkhclFields = memo(function OkhclFields() {
  const ctx = useColorPickerPanelContext()
  const okhcl = ctx.okhcl?.okhcl

  if (!ctx.isOkHCLFormat || !okhcl) return null

  return (
    <div className="flex flex-col gap-2">
      <OkhclChannelSlider
        label="Hue"
        value={okhcl.h}
        min={0}
        max={360}
        step={1}
        displayValue={Math.round(okhcl.h)}
        displayMin={0}
        displayMax={360}
        thumbFill={colorToCSS(ctx.okhclSliderPreview?.okhclHue ?? ctx.color)}
        gradient="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
        data-test-id="color-slider-okhcl-h"
        onValueChange={(next) => ctx.updateOkHCLChannel('h', next)}
        onDisplayChange={(next) => ctx.updateOkHCLChannel('h', next)}
      />

      <OkhclChannelSlider
        label="Chroma"
        value={okhcl.c}
        min={0}
        max={0.4}
        step={0.001}
        displayValue={toPercent(okhcl.c)}
        displayMin={0}
        displayMax={40}
        suffix="%"
        gradient={ctx.okhclSliderGradient?.okhclChroma}
        thumbFill={colorToCSS(ctx.okhclSliderPreview?.okhclChroma ?? ctx.color)}
        formatValueText={percentText}
        data-test-id="color-slider-okhcl-c"
        onValueChange={(next) => ctx.updateOkHCLChannel('c', next)}
        onDisplayChange={(next) => ctx.updateOkHCLChannel('c', fromPercent(next))}
      />

      <OkhclChannelSlider
        label="Lightness"
        value={okhcl.l}
        min={0}
        max={1}
        step={0.001}
        displayValue={toPercent(okhcl.l)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        gradient={ctx.okhclSliderGradient?.okhclLightness}
        thumbFill={colorToCSS(ctx.okhclSliderPreview?.okhclLightness ?? ctx.color)}
        formatValueText={percentText}
        data-test-id="color-slider-okhcl-l"
        onValueChange={(next) => ctx.updateOkHCLChannel('l', next)}
        onDisplayChange={(next) => ctx.updateOkHCLChannel('l', fromPercent(next))}
      />

      <OkhclChannelSlider
        label="Alpha"
        value={okhcl.a ?? 1}
        min={0}
        max={1}
        step={0.001}
        displayValue={toPercent(okhcl.a ?? 1)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        checkerboard
        gradient={`background: linear-gradient(to right, transparent, ${colorToCSS({ ...ctx.color, a: 1 })})`}
        thumbFill={colorToCSS(ctx.color)}
        formatValueText={percentText}
        data-test-id="color-slider-okhcl-a"
        onValueChange={(next) => ctx.updateOkHCLChannel('a', next)}
        onDisplayChange={(next) => ctx.updateOkHCLChannel('a', fromPercent(next))}
      />

      <div className="flex items-start justify-between gap-2 text-[10px] text-muted">
        <p className="min-w-0 flex-1 leading-4 break-words">{ctx.panels.colorHintOkhcl}</p>
        {ctx.okhcl?.previewColorSpace ? (
          <span className="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] uppercase">
            {ctx.okhcl.previewColorSpace}
          </span>
        ) : null}
      </div>
      {ctx.okhcl?.clipped ? (
        <p className="text-[10px] leading-4 text-[var(--color-warning-text)]">
          {ctx.panels.colorPreviewClipped({
            space: ctx.okhcl.previewColorSpace ?? 'display-p3'
          })}
        </p>
      ) : null}
    </div>
  )
})

OkhclFields.displayName = 'OkhclFields'
export default OkhclFields
