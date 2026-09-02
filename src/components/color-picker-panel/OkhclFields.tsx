import { colorToCSS } from '@open-pencil/core/color'
import { fromPercent, toPercent } from '@open-pencil/react'
import { PickerSlider } from '@/components/color-picker-panel/PickerSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export function OkhclFields() {
  const ctx = useColorPickerPanelContext()

  if (!ctx.isOkHCLFormat || !ctx.okhcl?.okhcl) return null

  const { okhcl } = ctx.okhcl

  return (
    <div className="flex flex-col gap-2">
      <PickerSlider
        label="H"
        value={okhcl.h}
        min={0}
        max={360}
        step={1}
        display={{ value: Math.round(okhcl.h), min: 0, max: 360, step: 1 }}
        gradientStyle="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
        thumbFill={colorToCSS(ctx.okhclSliderPreview?.okhclHue ?? ctx.color)}
        data-test-id="color-slider-okhcl-h"
        onChange={(v) => ctx.updateOkHCLChannel('h', v)}
      />
      <PickerSlider
        label="C"
        value={okhcl.c}
        min={0}
        max={0.4}
        step={0.001}
        display={{
          value: toPercent(okhcl.c),
          min: 0,
          max: 40,
          step: 1,
          parse: fromPercent
        }}
        gradientStyle={ctx.okhclSliderGradient?.okhclChroma ?? undefined}
        thumbFill={colorToCSS(ctx.okhclSliderPreview?.okhclChroma ?? ctx.color)}
        data-test-id="color-slider-okhcl-c"
        onChange={(v) => ctx.updateOkHCLChannel('c', v)}
      />
      <PickerSlider
        label="L"
        value={okhcl.l}
        min={0}
        max={1}
        step={0.001}
        display={{
          value: toPercent(okhcl.l),
          min: 0,
          max: 100,
          step: 1,
          parse: fromPercent
        }}
        gradientStyle={ctx.okhclSliderGradient?.okhclLightness ?? undefined}
        thumbFill={colorToCSS(ctx.okhclSliderPreview?.okhclLightness ?? ctx.color)}
        data-test-id="color-slider-okhcl-l"
        onChange={(v) => ctx.updateOkHCLChannel('l', v)}
      />
      <PickerSlider
        label="A"
        value={okhcl.a ?? 1}
        min={0}
        max={1}
        step={0.001}
        display={{
          value: toPercent(okhcl.a ?? 1),
          min: 0,
          max: 100,
          step: 1,
          parse: fromPercent
        }}
        checkerboard
        gradientStyle={`background: linear-gradient(to right, transparent, ${colorToCSS(ctx.color)})`}
        thumbFill={colorToCSS(ctx.color)}
        data-test-id="color-slider-okhcl-a"
        onChange={(v) => ctx.updateOkHCLChannel('a', v)}
      />
      <div className="flex items-start justify-between gap-2 text-[10px] text-muted">
        <p className="min-w-0 flex-1 leading-4 break-words">{ctx.panels.colorHintOkhcl}</p>
        {ctx.okhcl.previewColorSpace && (
          <span className="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] uppercase">
            {ctx.okhcl.previewColorSpace}
          </span>
        )}
      </div>
      {ctx.okhcl.clipped && (
        <p className="text-[10px] leading-4 text-[var(--color-warning-text)]">
          {ctx.panels.colorPreviewClipped({
            space: ctx.okhcl.previewColorSpace ?? 'display-p3'
          })}
        </p>
      )}
    </div>
  )
}
